import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { EmbeddingsService } from '../../services/embeddings/embeddings.service';
import { LlmService } from '../../services/llm/llm.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RetrieverService } from './retriever.service';

@Injectable()
export class RagService {
  constructor(
    private readonly retrieverService: RetrieverService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly llmService: LlmService,
    private readonly auditService: AuditService,
  ) {}

  chunkDocument(documentId: string) {
    return {
      documentId,
      chunksCreated: 0,
      status: 'placeholder',
    };
  }

  generateEmbeddings(documentId: string) {
    return this.embeddingsService.generateEmbedding(documentId);
  }

  retrieveRelevantChunks(question: string, user: AuthenticatedUser) {
    return this.retrieverService.retrieveRelevantChunks(question, user);
  }

  async answerWithSources(dto: RagQueryDto, user: AuthenticatedUser) {
    const chunks = await this.retrieveRelevantChunks(dto.question, user);

    if (!chunks.length) {
      return this.rejectIfNoSource(dto.question, user);
    }

    // TODO: Add source confidence scoring before returning an answer.
    // TODO: Add future AI response filtering so generated answers cannot bypass backend permissions.
    const mockAnswer = await this.llmService.answerQuestion(dto.question);
    return {
      answer: `${mockAnswer.answer}. This skeleton answer is grounded on mock retrieved sources only.`,
      refused: false,
      sources: chunks.map((chunk) => ({
        documentId: chunk.documentId,
        title: chunk.title,
        sourcePage: chunk.sourcePage,
      })),
    };
  }

  async rejectIfNoSource(question: string, user: AuthenticatedUser) {
    await this.auditService.logAIRefusal(user.userId, { question });
    return {
      answer:
        'I cannot answer this from validated HR sources yet. Please ask HR to validate an authoritative document first.',
      refused: true,
      sources: [],
    };
  }

  async indexDocument(documentId: string) {
    const chunking = this.chunkDocument(documentId);
    const embedding = await this.generateEmbeddings(documentId);

    return {
      documentId,
      status: 'placeholder-indexing-complete',
      chunking,
      embedding,
      rule: 'Only VALIDATED documents should be indexed for RAG; ARCHIVED documents must be excluded.',
    };
  }

  query(dto: RagQueryDto, user: AuthenticatedUser) {
    return this.answerWithSources(dto, user);
  }
}
