import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BookChunk } from '../../../database/entities/book-chunk.entity';

export interface VectorSearchResult {
  id: string;
  chapterId: string;
  chapterTitle: string;
  contentText: string;
  pageNumber: number | null;
  similarity: number;
}

@Injectable()
export class VectorSearchService {
  constructor(
    @InjectRepository(BookChunk)
    private readonly chunkRepository: Repository<BookChunk>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cosine similarity search via pgvector: 1 - (embedding <=> query_vector)
   */
  async search(
    tenantId: string,
    queryEmbedding: number[],
    options: { chapterId?: string; bookId?: string; topK?: number },
  ): Promise<VectorSearchResult[]> {
    const topK = options.topK ?? this.configService.get<number>('rag.topK') ?? 5;
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const qb = this.chunkRepository
      .createQueryBuilder('chunk')
      .innerJoin('chunk.chapter', 'chapter')
      .innerJoin('chapter.book', 'book')
      .select('chunk.id', 'id')
      .addSelect('chunk.chapterId', 'chapterId')
      .addSelect('chapter.title', 'chapterTitle')
      .addSelect('chunk.contentText', 'contentText')
      .addSelect('chunk.pageNumber', 'pageNumber')
      .addSelect(
        `1 - (chunk.embedding <=> '${vectorLiteral}'::vector)`,
        'similarity',
      )
      .where('book.tenantId = :tenantId', { tenantId })
      .andWhere('chunk.embedding IS NOT NULL');

    if (options.chapterId) {
      qb.andWhere('chunk.chapterId = :chapterId', {
        chapterId: options.chapterId,
      });
    }
    if (options.bookId) {
      qb.andWhere('chapter.bookId = :bookId', { bookId: options.bookId });
    }

    const rows = await qb
      .orderBy('chunk.embedding <=> :queryVector::vector', 'ASC')
      .setParameter('queryVector', vectorLiteral)
      .limit(topK)
      .getRawMany<VectorSearchResult>();

    return rows;
  }
}
