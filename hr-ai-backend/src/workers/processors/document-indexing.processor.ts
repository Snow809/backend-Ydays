import { Injectable, Logger } from '@nestjs/common';
import { RagService } from '../../modules/rag/rag.service';

@Injectable()
export class DocumentIndexingProcessor {
  private readonly logger = new Logger(DocumentIndexingProcessor.name);

  constructor(private readonly ragService: RagService) {}

  async handle(documentId: string) {
    this.logger.log(`Processing indexing job for document: ${documentId}`);
    try {
      const result = await this.ragService.indexDocument(documentId);
      this.logger.log(`Successfully indexed document: ${documentId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to index document: ${documentId}`, error.stack);
      throw error;
    }
  }
}

