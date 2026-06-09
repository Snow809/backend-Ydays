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
    return this.prisma.hRDocument.create({
      data: {
        title: dto.title,
        category: dto.category,
        version: dto.version ?? '1.0',
        filePath,
        uploadedByUserId: user.userId,
      },
    });
  }

  findAll() {
    return this.prisma.hRDocument.findMany();
  }

  findOne(id: string) {
    return this.prisma.hRDocument.findUnique({ where: { id } });
  }

  async validate(id: string, dto: ValidateDocumentDto, user: AuthenticatedUser) {
    const document = await this.prisma.hRDocument.update({
      where: { id },
      data: {
        status: 'VALIDATED',
        validatedByUserId: user.userId,
      },
    });
    await this.auditService.logDocumentValidation(user.userId, id, { comment: dto.comment });
    return document;
  }

  archive(id: string) {
    return this.prisma.hRDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
