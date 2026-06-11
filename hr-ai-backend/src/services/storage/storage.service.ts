import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class StorageService {
  constructor(private readonly config: AppConfigService) {}

  async saveUploadedFile(file: Express.Multer.File): Promise<string> {
    await mkdir(this.config.uploadDir, { recursive: true });
    const fileName = `${randomUUID()}${extname(file.originalname)}`;
    const filePath = join(this.config.uploadDir, fileName);
    await writeFile(filePath, file.buffer);
    return filePath;
  }

  async saveGeneratedDocument(content: string, baseName: string): Promise<string> {
    const directory = join(this.config.uploadDir, 'generated-documents');
    await mkdir(directory, { recursive: true });
    const safeBaseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const fileName = `${safeBaseName || 'document'}-${randomUUID()}.txt`;
    const filePath = join(directory, fileName);
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  getStorageProvider() {
    return {
      provider: 'local',
      note: 'Skeleton storage adapter. Replace with S3 or MinIO later without changing controllers.',
    };
  }
}
