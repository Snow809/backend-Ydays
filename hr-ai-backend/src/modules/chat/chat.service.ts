import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { RagService } from '../rag/rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatFeedbackDto } from './dto/chat-feedback.dto';
import { EscalateConversationDto } from './dto/escalate-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
    private readonly auditService: AuditService,
  ) {}

  async ask(dto: AskQuestionDto, user: AuthenticatedUser) {
    if (!user?.userId) {
      await this.auditService.logSecurityBlock(undefined, { reason: 'missing-user-context' });
      return {
        conversationId: dto.conversationId ?? 'not-created',
        answer: 'You are not authorized to use the HR assistant.',
        refused: true,
        sources: [],
      };
    }

    // Check if user is temporarily blocked from using AI due to repeated violations (US-SUP-03)
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const violationsCount = await this.prisma.securityAlert.count({
      where: {
        userId: user.userId,
        alertType: { in: ['PROMPT_INJECTION', 'AI_SENSITIVE_REQUEST'] },
        createdAt: { gte: since },
      },
    });

    if (violationsCount >= 3) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'user-temporarily-blocked-due-to-repeated-violations',
        violationsCount,
      });
      return {
        conversationId: dto.conversationId ?? 'not-created',
        answer: "Votre accès à l'assistant IA a été temporairement suspendu en raison de requêtes répétées non conformes aux politiques de sécurité. Veuillez contacter votre administrateur RH.",
        refused: true,
        sources: [],
      };
    }


    const conversation = dto.conversationId
      ? await this.prisma.chatConversation.findUnique({ where: { id: dto.conversationId } })
      : await this.prisma.chatConversation.create({
          data: {
            userId: user.userId,
            title: dto.question.slice(0, 80),
          },
        });

    if (!conversation || conversation.userId !== user.userId) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'conversation-access-denied',
        conversationId: dto.conversationId,
      });
      return {
        conversationId: dto.conversationId ?? 'not-created',
        answer: 'You are not authorized to access this conversation.',
        refused: true,
        sources: [],
      };
    }

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.question,
      },
    });

    const ragResponse = await this.ragService.query({ question: dto.question }, user);

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: ragResponse.answer,
        sources: ragResponse.sources,
      },
    });

    return {
      conversationId: conversation.id,
      ...ragResponse,
    };
  }

  findConversations(user: AuthenticatedUser) {
    return this.prisma.chatConversation.findMany({
      where: { userId: user.userId },
      include: { messages: false },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findConversation(id: string, user: AuthenticatedUser) {
    return this.prisma.chatConversation.findFirst({
      where: { id, userId: user.userId },
      include: { messages: true },
    });
  }

  async addFeedback(messageId: string, dto: ChatFeedbackDto, user: AuthenticatedUser) {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversation: { userId: user.userId },
      },
      include: { conversation: true },
    });

    if (!message) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'feedback-message-access-denied',
        messageId,
      });
      return {
        status: 'rejected',
        message: 'You cannot add feedback to this message.',
      };
    }

    await this.auditService.logSensitiveAction(user.userId, 'ChatMessage', messageId, {
      action: 'chat_feedback',
      helpful: dto.helpful,
      comment: dto.comment,
      conversationId: message.conversationId,
    });

    return {
      status: 'recorded',
      messageId,
      helpful: dto.helpful,
    };
  }

  async escalateConversation(id: string, dto: EscalateConversationDto, user: AuthenticatedUser) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id, userId: user.userId },
    });

    if (!conversation) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'escalation-conversation-access-denied',
        conversationId: id,
      });
      return {
        status: 'rejected',
        message: 'You cannot escalate this conversation.',
      };
    }

    const alert = await this.prisma.alert.create({
      data: {
        type: 'AI_SECURITY',
        title: 'Conversation requires HR review',
        message: dto.reason ?? 'User requested escalation to a human HR contact.',
        targetId: id,
      },
    });

    await this.auditService.logSensitiveAction(user.userId, 'ChatConversation', id, {
      action: 'human_escalation',
      alertId: alert.id,
      reason: dto.reason,
    });

    return {
      status: 'escalated',
      conversationId: id,
      alertId: alert.id,
    };
  }
}
