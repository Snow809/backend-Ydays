import { Module } from '@nestjs/common';
import { DocumentIndexingProcessor } from './processors/document-indexing.processor';
import { PredictionProcessor } from './processors/prediction.processor';
import { RagModule } from '../modules/rag/rag.module';

@Module({
  imports: [RagModule],
  providers: [DocumentIndexingProcessor, PredictionProcessor],
  exports: [DocumentIndexingProcessor, PredictionProcessor],
})
export class WorkersModule {}

