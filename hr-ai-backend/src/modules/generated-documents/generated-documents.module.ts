import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LlmModule } from '../../services/llm/llm.module';
import { GeneratedDocumentsController } from './generated-documents.controller';
import { GeneratedDocumentsService } from './generated-documents.service';

@Module({
  imports: [AuditModule, LlmModule],
  controllers: [GeneratedDocumentsController],
  providers: [GeneratedDocumentsService],
})
export class GeneratedDocumentsModule {}
