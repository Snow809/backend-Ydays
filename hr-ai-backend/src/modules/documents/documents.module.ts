import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../services/storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { S3Service } from './s3.service';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { GenerationService } from './generation.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [TemplatesController, DocumentsController],
  providers: [DocumentsService, S3Service, TemplatesService, GenerationService],
  exports: [DocumentsService, GenerationService],
})
export class DocumentsModule {}
