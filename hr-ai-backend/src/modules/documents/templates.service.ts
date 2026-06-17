import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from './s3.service';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async findAll(includeInactive = false) {
    return this.prisma.documentTemplate.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { fullName: true, email: true } }
      }
    });
  }

  async create(userId: string, data: any, file: Express.Multer.File) {
    const fileExtension = file.originalname.split('.').pop() || 'docx';
    const key = `templates/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    await this.s3.uploadFile(key, file.buffer, file.mimetype);

    return this.prisma.documentTemplate.create({
      data: {
        uploadedBy: userId,
        title: data.title,
        documentType: data.documentType,
        category: data.category || 'General',
        description: data.description,
        filePath: key,
        sizeBytes: file.size,
        fileType: fileExtension.toUpperCase(),
        isActive: true,
      }
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    // Optionally delete from S3
    try {
      await this.s3.deleteFile(template.filePath);
    } catch (e) {
      console.error('Could not delete file from S3', e);
    }

    return this.prisma.documentTemplate.delete({ where: { id } });
  }
}
