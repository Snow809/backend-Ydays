import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { RagService } from '../rag/rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';

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
}
