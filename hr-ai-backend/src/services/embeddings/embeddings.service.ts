import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingsService {
  async generateEmbedding(text: string) {
    return {
      inputLength: text.length,
      embedding: 'mock-vector-placeholder',
      note: 'Replace with pgvector-compatible embeddings when RAG is implemented.',
    };
  }
}
