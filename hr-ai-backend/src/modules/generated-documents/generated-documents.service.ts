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

  private mapToAppStatus(doc: any) {
    if (!doc) return doc;
    let appStatus = 'DRAFT';
    if (doc.status === 'PENDING_REVIEW') appStatus = 'IN_REVIEW';
    if (doc.status === 'APPROVED') appStatus = 'VALIDATED';
    if (doc.status === 'ARCHIVED') appStatus = 'REJECTED';
    return {
      ...doc,
      status: appStatus,
      type: doc.documentType,
      prompt: 'Prompt is hidden/not stored in DB',
      draftContent: 'Draft content placeholder',
      rejectionReason: null,
      requestedByUserId: doc.generatedBy,
      validatedByUserId: doc.validatedBy,
    };
  }

  async request(dto: RequestGeneratedDocumentDto, user: AuthenticatedUser) {
    let employeeId = 'default-employee';
    if (user.email) {
      const employee = await this.prisma.employee.findUnique({ where: { email: user.email } });
      if (employee) employeeId = employee.id;
    }

    const doc = await this.prisma.generatedDocument.create({
      data: {
        employeeId,
        generatedBy: user.userId,
        documentType: dto.type,
        filePath: `uploads/generated/draft_${Date.now()}.txt`,
        status: 'DRAFT',
      },
    });
    return this.mapToAppStatus(doc);
  }

  async generateDraft(id: string) {
    const existing = await this.prisma.generatedDocument.findUnique({ where: { id } });
    await this.llmService.generateDraft('prompt placeholder');

    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
      },
    });
    return this.mapToAppStatus(doc);
  }

  async validate(id: string, dto: ValidateGeneratedDocumentDto, user: AuthenticatedUser) {
    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        validatedBy: user.userId,
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'validate',
      comment: dto.comment,
    });
    return this.mapToAppStatus(doc);
  }

  async reject(id: string, dto: RejectGeneratedDocumentDto, user: AuthenticatedUser) {
    const doc = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
    await this.auditService.logSensitiveAction(user.userId, 'GeneratedDocument', id, {
      action: 'reject',
      reason: dto.reason,
    });
    return this.mapToAppStatus(doc);
  }

  async findAll() {
    const docs = await this.prisma.generatedDocument.findMany();
    return docs.map(doc => this.mapToAppStatus(doc));
  }

  download(id: string) {
    return {
      id,
      status: 'placeholder-download',
      message: 'Only HR-validated generated documents should be downloadable by employees.',
    };
  }
}
