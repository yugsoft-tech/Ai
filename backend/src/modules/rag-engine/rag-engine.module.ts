import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../../database/entities/book.entity';
import { BookChunk } from '../../database/entities/book-chunk.entity';
import { Chapter } from '../../database/entities/chapter.entity';
import { RagEngineController } from './rag-engine.controller';
import { RagEngineService } from './rag-engine.service';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { PdfExtractionService } from './services/pdf-extraction.service';
import { VectorSearchService } from './services/vector-search.service';
import { ChapterDetectionService } from './services/chapter-detection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter, BookChunk])],
  controllers: [RagEngineController],
  providers: [
    RagEngineService,
    PdfExtractionService,
    ChunkingService,
    EmbeddingService,
    VectorSearchService,
    ChapterDetectionService,
  ],
  exports: [RagEngineService, VectorSearchService, EmbeddingService],
})
export class RagEngineModule {}
