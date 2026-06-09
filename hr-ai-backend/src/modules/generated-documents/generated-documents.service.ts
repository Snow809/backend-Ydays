import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LlmService } from '../../services/llm/llm.service';
import { AuditService } from '../audit/audit.service';
import { RequestGeneratedDocumentDto } from './dto/request-generated-document.dto';
import { RejectGeneratedDocumentDto } from './dto/reject-generated-document.dto';
import { ValidateGeneratedDocumentDto } from './dto/validate-generated-document.dto';

@Injectable()
export class GeneratedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly auditService: AuditService,
  ) {}

  request(dto: RequestGeneratedDocumentDto, user: AuthenticatedUser) {
    return this.prisma.generatedDocument.create({
      data: {
        type: dto.type,
        prompt: dto.prompt,
        requestedByUserId: user.userId,
      },
    });
  }

  async generateDraft(id: string) {
    const existing = await this.prisma.generatedDocument.findUnique({ where: { id } });
    const draft = await this.llmService.generateDraft(existing?.prompt ?? 'unknown prompt');

    return this.prisma.generatedDocument.update({
      where: { id },
      data: {
        draftContent: draft.content,
        status: 'IN_REVIEW',
      },
    });
  }

  async validate(id: string, dto: ValidateGeneratedDocumentDto, user: AuthenticatedUser) {
    const document = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'VALIDATED',
        validatedByUserId: user.userId,
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'validate',
      comment: dto.comment,
    });
    return document;
  }

  async reject(id: string, dto: RejectGeneratedDocumentDto, user: AuthenticatedUser) {
    const document = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'reject',
      reason: dto.reason,
    });
    return document;
  }

  findAll() {
    return this.prisma.generatedDocument.findMany();
  }

  download(id: string) {
    return {
      id,
      status: 'placeholder-download',
      message: 'Only HR-validated generated documents should be downloadable by employees.',
    };
  }
}
