import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { EmbeddingsService } from '../../services/embeddings/embeddings.service';
import { LlmService } from '../../services/llm/llm.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RetrieverService } from './retriever.service';
import { PrismaService } from '../../database/prisma.service';
import { DocumentParserService } from '../../services/document-parser/document-parser.service';

const PROMPT_INJECTION_PATTERNS = [
  /ignore.*instruction/i,
  /ignore.*previous/i,
  /system prompt/i,
  /developer message/i,
  /reveal.*prompt/i,
  /bypass/i,
  /jailbreak/i,
];

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieverService: RetrieverService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly llmService: LlmService,
    private readonly auditService: AuditService,
    private readonly documentParser: DocumentParserService,
  ) {}

  async chunkDocument(documentId: string) {
    const document = await this.prisma.hRDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const parsed = await this.documentParser.parse(document.filePath);
    const text = parsed.text;

    const paragraphs = text
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks: string[] = [];
    for (const paragraph of paragraphs) {
      if (paragraph.length <= 1000) {
        chunks.push(paragraph);
      } else {
        let startIndex = 0;
        while (startIndex < paragraph.length) {
          chunks.push(paragraph.substring(startIndex, startIndex + 800));
          startIndex += 700; // 100 characters overlap
        }
      }
    }

    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    let chunkIndex = 0;
    for (const chunkText of chunks) {
      const embRes = await this.embeddingsService.generateEmbedding(chunkText);
      await this.prisma.documentChunk.create({
        data: {
          documentId,
          content: chunkText,
          chunkIndex,
          sourcePage: 1,
          embedding: embRes.embedding,
        },
      });
      chunkIndex++;
    }

    return {
      documentId,
      chunksCreated: chunks.length,
      status: 'success',
    };
  }

  generateEmbeddings(documentId: string) {
    return this.embeddingsService.generateEmbedding(documentId);
  }

  retrieveRelevantChunks(question: string, user: AuthenticatedUser) {
    return this.retrieverService.retrieveRelevantChunks(question, user);
  }

  async answerWithSources(dto: RagQueryDto, user: AuthenticatedUser) {
    if (this.isPromptInjection(dto.question)) {
      await this.auditService.logSecurityBlock(user.userId, {
        reason: 'prompt-injection-detected',
        question: dto.question,
      });
      await this.prisma.securityAlert.create({
        data: {
          userId: user.userId,
          alertType: 'PROMPT_INJECTION',
          severity: 'CRITICAL',
          status: 'OPEN',
        },
      });

      return {
        answer:
          'Je ne peux pas traiter cette demande car elle ressemble a une tentative de contournement des consignes de securite.',
        refused: true,
        sources: [],
      };
    }

    const chunks = await this.retrieveRelevantChunks(dto.question, user);

    if (!chunks.length) {
      return this.rejectIfNoSource(dto.question, user);
    }

    const contextText = chunks.map((c) => `Source: ${c.title}\nContenu: ${c.content}`).join('\n\n');
    const prompt = `Voici des informations issues de documents RH validés:\n\n${contextText}\n\nQuestion de l'utilisateur: ${dto.question}\n\nRépond à la question de manière professionnelle et uniquement en utilisant les informations ci-dessus. Si les informations ne permettent pas de répondre, indique-le clairement.`;

    const modelResponse = await this.llmService.answerQuestion(prompt);
    
    let answer = modelResponse.answer;
    if (modelResponse.answer.startsWith('Mock answer for:')) {
      const titles = Array.from(new Set(chunks.map((c) => c.title))).join(', ');
      answer = `Selon les documents RH (${titles}), voici ce que nous pouvons indiquer : réponse simulée à la question "${dto.question}" basée sur les sources fournies.`;
    }

    return {
      answer,
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
    const document = await this.prisma.hRDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (document.status !== 'VALIDATED') {
      throw new Error(`Only VALIDATED documents can be indexed for RAG. Status: ${document.status}`);
    }

    const chunking = await this.chunkDocument(documentId);

    return {
      documentId,
      status: 'complete',
      chunking,
      rule: 'Only VALIDATED documents should be indexed for RAG; ARCHIVED documents must be excluded.',
    };
  }

  query(dto: RagQueryDto, user: AuthenticatedUser) {
    return this.answerWithSources(dto, user);
  }

  private isPromptInjection(question: string) {
    return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(question));
  }
}
