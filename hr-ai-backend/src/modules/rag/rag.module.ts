import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmbeddingsModule } from '../../services/embeddings/embeddings.module';
import { LlmModule } from '../../services/llm/llm.module';
import { DocumentParserModule } from '../../services/document-parser/document-parser.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RetrieverService } from './retriever.service';

@Module({
  imports: [AuditModule, EmbeddingsModule, LlmModule, DocumentParserModule],
  controllers: [RagController],
  providers: [RagService, RetrieverService],
  exports: [RagService],
})
export class RagModule {}

