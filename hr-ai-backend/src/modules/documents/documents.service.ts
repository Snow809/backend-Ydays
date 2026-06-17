import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../services/storage/storage.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async upload(dto: CreateDocumentDto, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const filePath = await this.storageService.saveUploadedFile(file);
    return this.prisma.hrDocument.create({
      data: {
        title: dto.title,
        category: dto.category || 'General',
        documentType: dto.category || 'HR Document',
        filePath,
        uploadedBy: user.userId,
        sizeBytes: file.size,
        fileType: file.originalname.split('.').pop()?.toUpperCase() || 'PDF',
      },
    });
  }

  findAll() {
    return this.prisma.hrDocument.findMany();
  }

  findOne(id: string) {
    return this.prisma.hrDocument.findUnique({ where: { id } });
  }

  async validate(id: string, dto: ValidateDocumentDto, user: AuthenticatedUser) {
    const document = await this.prisma.hrDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
    await this.auditService.logDocumentValidation(user.userId, id, { comment: dto.comment });
    return document;
  }

  archive(id: string) {
    return this.prisma.hrDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
