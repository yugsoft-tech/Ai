import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PageText } from './pdf-extraction.service';

export interface ChunkWithPage {
  contentText: string;
  pageNumber: number;
}

@Injectable()
export class ChunkingService {
  constructor(private readonly configService: ConfigService) {}

  semanticChunk(pages: PageText[]): ChunkWithPage[] {
    const chunkSize = this.configService.get<number>('rag.chunkSize') ?? 800;
    const overlap = this.configService.get<number>('rag.chunkOverlap') ?? 100;

    const chunks: ChunkWithPage[] = [];

    for (const page of pages) {
      const normalized = page.text.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;

      let start = 0;
      while (start < normalized.length) {
        let end = Math.min(start + chunkSize, normalized.length);
        if (end < normalized.length) {
          const boundary = normalized.lastIndexOf('. ', end);
          if (boundary > start + chunkSize * 0.5) {
            end = boundary + 1;
          }
        }
        const textChunk = normalized.slice(start, end).trim();
        if (textChunk) {
          chunks.push({
            contentText: textChunk,
            pageNumber: page.pageNumber,
          });
        }
        if (end >= normalized.length) break;
        start = Math.max(end - overlap, start + 1);
      }
    }

    return chunks;
  }
}
