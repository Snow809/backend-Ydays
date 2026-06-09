import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RetrieverService {
  constructor(private readonly prisma: PrismaService) {}

  async retrieveRelevantChunks(question: string, user: AuthenticatedUser) {
    // TODO: Add prompt injection detection before retrieval.
    // TODO: Add role-aware sensitive chunk filtering before returning context to the LLM.
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        document: {
          status: 'VALIDATED',
        },
        content: {
          contains: question.split(' ')[0] ?? '',
          mode: 'insensitive',
        },
      },
      take: 3,
      include: {
        document: true,
      },
    });

    return chunks.map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.document.title,
      content: chunk.content,
      sourcePage: chunk.sourcePage ?? undefined,
      visibleForRole: user.role,
    }));
  }
}
