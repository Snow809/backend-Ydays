import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentRequestStatus, Prisma, UserRole } from '@prisma/client';
import { basename } from 'path';
import { readFile } from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../services/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { RejectDocumentRequestDto } from './dto/reject-document-request.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

const DEFAULT_TEMPLATE_VARIABLES = [
  'employee_name',
  'employee_position',
  'department',
  'manager_name',
  'date',
];

@Injectable()
export class DocumentWorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async createTemplate(
    dto: CreateDocumentTemplateDto,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A template file is required');
    }

    const filePath = await this.storageService.saveUploadedFile(file);
    const template = await this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        filePath,
        variables: this.parseVariables(dto.variables),
        isActive: this.parseBoolean(dto.isActive, true),
        createdByUserId: user.userId,
      },
    });

    await this.auditService.logSensitiveAction(user.userId, 'DocumentTemplate', template.id, {
      action: 'create',
      type: template.type,
    });

    return template;
  }

  findTemplates() {
    return this.prisma.documentTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  findActiveTemplates() {
    return this.prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
        requests: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Document template not found');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateDocumentTemplateDto,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    await this.ensureTemplateExists(id);

    const filePath = file ? await this.storageService.saveUploadedFile(file) : undefined;
    const template = await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        filePath,
        variables: dto.variables ? this.parseVariables(dto.variables) : undefined,
        isActive: dto.isActive === undefined ? undefined : this.parseBoolean(dto.isActive, true),
      },
    });

    await this.auditService.logSensitiveAction(user.userId, 'DocumentTemplate', id, {
      action: 'update',
    });

    return template;
  }

  async deactivateTemplate(id: string, user: AuthenticatedUser) {
    await this.ensureTemplateExists(id);
    const template = await this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.logSensitiveAction(user.userId, 'DocumentTemplate', id, {
      action: 'deactivate',
    });

    return template;
  }

  async deleteTemplate(id: string, user: AuthenticatedUser) {
    await this.ensureTemplateExists(id);

    try {
      const template = await this.prisma.documentTemplate.delete({ where: { id } });
      await this.auditService.logSensitiveAction(user.userId, 'DocumentTemplate', id, {
        action: 'delete',
      });
      return template;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Template already has requests and should be deactivated instead');
      }
      throw error;
    }
  }

  async createRequest(dto: CreateDocumentRequestDto, user: AuthenticatedUser) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        id: dto.templateId,
        isActive: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Active document template not found');
    }

    const employee = await this.resolveRequestEmployee(dto.employeeId, user);
    if (!employee.managerId) {
      throw new BadRequestException('Employee manager must be configured before requesting a document');
    }

    return this.prisma.documentRequest.create({
      data: {
        templateId: template.id,
        employeeId: employee.id,
        managerId: employee.managerId,
        status: DocumentRequestStatus.PENDING,
      },
      include: this.requestInclude(),
    });
  }

  async findMyRequests(user: AuthenticatedUser) {
    if (this.isElevated(user)) {
      return this.findRequestHistory();
    }

    const employee = await this.getEmployeeByUser(user.userId);
    return this.prisma.documentRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { requestedAt: 'desc' },
      include: this.requestInclude(),
    });
  }

  async findPendingApproval(user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) {
      return this.prisma.documentRequest.findMany({
        where: { status: DocumentRequestStatus.PENDING },
        orderBy: { requestedAt: 'desc' },
        include: this.requestInclude(),
      });
    }

    const manager = await this.getEmployeeByUser(user.userId);
    return this.prisma.documentRequest.findMany({
      where: {
        managerId: manager.id,
        status: DocumentRequestStatus.PENDING,
      },
      orderBy: { requestedAt: 'desc' },
      include: this.requestInclude(),
    });
  }

  findRequestHistory() {
    return this.prisma.documentRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: this.requestInclude(),
    });
  }

  async approveRequest(id: string, user: AuthenticatedUser) {
    const request = await this.getRequestForReview(id);
    await this.assertCanReview(request.managerId, user);

    if (request.status !== DocumentRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // Validate document coherence before generating (US-DOC-03)
    const templateVariables = request.template.variables;
    const values: Record<string, string> = {
      employee_name: request.employee.fullName,
      employee_position: request.employee.positionEntity?.title ?? request.employee.position ?? '',
      department: request.employee.departmentEntity?.name ?? request.employee.department ?? '',
      manager_name: request.employee.manager?.fullName ?? request.manager?.fullName ?? '',
      date: new Date().toLocaleDateString('fr-FR'),
    };

    const missingVariables = [];
    for (const variable of templateVariables) {
      if (!values[variable] || values[variable].trim() === '') {
        missingVariables.push(variable);
      }
    }

    if (missingVariables.length > 0) {
      throw new BadRequestException(
        `Document coherence check failed. Critical missing data for: ${missingVariables.join(', ')}. Please update the employee file first.`,
      );
    }

    const generatedContent = await this.generateDocumentContent(request);
    const generatedFilePath = await this.storageService.saveGeneratedDocument(
      generatedContent,
      `${request.template.type}-${request.employee.fullName}`,
    );

    const generatedDocument = await this.prisma.generatedDocument.create({
      data: {
        employeeId: request.employeeId,
        type: request.template.type,
        prompt: `Generated from template ${request.template.name}`,
        draftContent: generatedContent,
        filePath: generatedFilePath,
        status: 'VALIDATED',
        requestedByUserId: request.employee.userId ?? user.userId,
        validatedByUserId: user.userId,
      },
    });

    const updated = await this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentRequestStatus.GENERATED,
        reviewedAt: new Date(),
        generatedAt: new Date(),
        generatedFilePath,
        generatedContent,
        generatedDocumentId: generatedDocument.id,
      },
      include: this.requestInclude(),
    });

    await this.auditService.logSensitiveAction(user.userId, 'DocumentRequest', id, {
      action: 'approve_and_generate',
      generatedDocumentId: generatedDocument.id,
    });

    return updated;
  }

  async rejectRequest(id: string, dto: RejectDocumentRequestDto, user: AuthenticatedUser) {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('A rejection reason is required');
    }

    const request = await this.getRequestForReview(id);
    await this.assertCanReview(request.managerId, user);

    if (request.status !== DocumentRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const updated = await this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentRequestStatus.REJECTED,
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
      include: this.requestInclude(),
    });

    await this.auditService.logSensitiveAction(user.userId, 'DocumentRequest', id, {
      action: 'reject',
      reason,
    });

    return updated;
  }

  async prepareDownload(id: string, user: AuthenticatedUser) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        employee: true,
        manager: true,
        generatedDocument: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Document request not found');
    }

    await this.assertCanReadRequest(request.employeeId, request.managerId, user);

    const filePath = request.generatedFilePath ?? request.generatedDocument?.filePath;
    if (!filePath) {
      throw new BadRequestException('Generated document is not available yet');
    }

    return {
      filePath,
      fileName: basename(filePath),
    };
  }

  private async ensureTemplateExists(id: string) {
    const exists = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Document template not found');
    }
  }

  private async resolveRequestEmployee(employeeId: string | undefined, user: AuthenticatedUser) {
    if (employeeId && this.isElevated(user)) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { manager: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      return employee;
    }

    return this.getEmployeeByUser(user.userId);
  }

  private async getEmployeeByUser(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: { manager: true },
    });

    if (!employee) {
      throw new BadRequestException('Current user is not linked to an employee profile');
    }

    return employee;
  }

  private async getRequestForReview(id: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        template: true,
        employee: {
          include: {
            manager: true,
            departmentEntity: true,
            positionEntity: true,
          },
        },
        manager: true,
        generatedDocument: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Document request not found');
    }

    return request;
  }

  private async assertCanReview(managerId: string | null, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    const manager = await this.getEmployeeByUser(user.userId);
    if (!managerId || manager.id !== managerId) {
      throw new ForbiddenException('Only the direct manager can review this request');
    }
  }

  private async assertCanReadRequest(
    employeeId: string,
    managerId: string | null,
    user: AuthenticatedUser,
  ) {
    if (this.isElevated(user)) {
      return;
    }

    const employee = await this.getEmployeeByUser(user.userId);
    if (employee.id === employeeId || employee.id === managerId) {
      return;
    }

    throw new ForbiddenException('You cannot access this generated document');
  }

  private async generateDocumentContent(
    request: Awaited<ReturnType<DocumentWorkflowsService['getRequestForReview']>>,
  ) {
    const templateContent = await this.readTemplateContent(request.template.filePath, request.template.name);
    const values: Record<string, string> = {
      employee_name: request.employee.fullName,
      employee_position: request.employee.positionEntity?.title ?? request.employee.position ?? '',
      department: request.employee.departmentEntity?.name ?? request.employee.department ?? '',
      manager_name: request.employee.manager?.fullName ?? request.manager?.fullName ?? '',
      date: new Date().toLocaleDateString('fr-FR'),
    };

    return templateContent.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
      return values[key] ?? '';
    });
  }

  private async readTemplateContent(filePath: string, templateName: string) {
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      return [
        `Document: ${templateName}`,
        '',
        'Employee: {{employee_name}}',
        'Position: {{employee_position}}',
        'Department: {{department}}',
        'Manager: {{manager_name}}',
        'Date: {{date}}',
      ].join('\n');
    }
  }

  private parseVariables(input: string | undefined) {
    if (!input?.trim()) {
      return DEFAULT_TEMPLATE_VARIABLES;
    }

    const trimmed = input.trim();
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private parseBoolean(input: string | undefined, defaultValue: boolean) {
    if (input === undefined || input === '') {
      return defaultValue;
    }

    const normalized = input.toLowerCase();
    if (['true', '1', 'yes', 'active'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'inactive'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException('isActive must be true or false');
  }

  private isElevated(user: AuthenticatedUser) {
    return user.role === UserRole.ADMIN || user.role === UserRole.HR;
  }

  private requestInclude() {
    return {
      template: true,
      employee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          position: true,
          department: true,
          managerId: true,
        },
      },
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      generatedDocument: {
        select: {
          id: true,
          type: true,
          status: true,
          filePath: true,
          createdAt: true,
        },
      },
    };
  }
}
