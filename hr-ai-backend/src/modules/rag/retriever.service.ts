import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RetrieverService {
  constructor(private readonly prisma: PrismaService) {}

  async retrieveRelevantChunks(question: string, user: AuthenticatedUser) {
    const terms = question
      .toLowerCase()
      .split(/\W+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3)
      .slice(0, 5);

    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        document: {
          status: 'VALIDATED',
          OR: [
            { confidentialityLevel: null },
            { confidentialityLevel: 'PUBLIC' },
            { confidentialityLevel: user.role },
            ...(user.role === 'ADMIN' || user.role === 'HR'
              ? [{ confidentialityLevel: 'HR' }, { confidentialityLevel: 'CONFIDENTIAL' }]
              : []),
          ],
        },
        OR: terms.length
          ? terms.map((term) => ({
              content: {
                contains: term,
                mode: 'insensitive' as const,
              },
            }))
          : undefined,
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
