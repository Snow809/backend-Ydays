import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  logRoleChange(actorUserId: string | undefined, targetId: string, metadata?: Record<string, unknown>) {
    return this.createLog(actorUserId, 'ROLE_CHANGE', 'User', targetId, metadata);
  }

  logDocumentValidation(
    actorUserId: string | undefined,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createLog(actorUserId, 'DOCUMENT_VALIDATION', 'HRDocument', targetId, metadata);
  }

  logAIRefusal(actorUserId: string | undefined, metadata?: Record<string, unknown>) {
    return this.createLog(actorUserId, 'AI_REFUSAL', 'AI', undefined, metadata);
  }

  logSecurityBlock(actorUserId: string | undefined, metadata?: Record<string, unknown>) {
    return this.createLog(actorUserId, 'SECURITY_BLOCK', 'Security', undefined, metadata);
  }

  logSensitiveAction(
    actorUserId: string | undefined,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createLog(actorUserId, 'SENSITIVE_ACTION', targetType, targetId, metadata);
  }

  private createLog(
    actorUserId: string | undefined,
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        targetType,
        targetId,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
