import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BookChunk } from '../../database/entities/book-chunk.entity';
import { Chapter } from '../../database/entities/chapter.entity';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { PdfExtractionService } from './services/pdf-extraction.service';
import { VectorSearchService } from './services/vector-search.service';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { VectorSearchResult } from './services/vector-search.service';

const DEFAULT_TEXT = `The fundamental principles of artificial intelligence are rooted in the concept of machine learning, where systems improve their performance on a given task by analyzing vast amounts of data.
Neural networks mimic the human brain's interconnected neuron structure, allowing complex pattern recognition and deep learning capabilities.
In natural language processing (NLP), models use these networks to understand context, semantics, and syntax. This forms the basis for modern conversational agents and generative models.
Another crucial aspect is reinforcement learning, where an agent learns to make decisions by performing actions in an environment to maximize a reward signal. This approach has led to significant breakthroughs in robotics and complex game playing.
The integration of these technologies into educational software enables personalized learning pathways, instant feedback, and adaptive testing mechanisms that cater to the unique needs of each student.`;

@Injectable()
export class RagEngineService {
  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly isGemini: boolean;
  private readonly openaiClient: OpenAI | null;

  constructor(
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(BookChunk)
    private readonly chunkRepository: Repository<BookChunk>,
    private readonly pdfExtraction: PdfExtractionService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly vectorSearch: VectorSearchService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('openai.apiKey') ?? '';
    this.chatModel = this.configService.get<string>('openai.chatModel') ?? 'gemini-2.5-flash';
    this.isGemini =
      this.apiKey.startsWith('AQ.') ||
      this.apiKey.startsWith('AIzaSy') ||
      this.chatModel.includes('gemini');

    if (!this.isGemini && this.apiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.apiKey });
    } else {
      this.openaiClient = null;
    }
  }

  async ingestPdf(
    tenantId: string,
    chapterId: string,
    fileBuffer: Buffer,
  ): Promise<{ chunksCreated: number }> {
    console.log(`[INGEST] Starting ingestPdf — chapterId=${chapterId}, tenantId=${tenantId}, bufferSize=${fileBuffer?.length ?? 0}`);

    // Step 1: Find chapter
    let chapter: Chapter | null = null;
    try {
      chapter = await this.chapterRepository.findOne({
        where: { id: chapterId },
        relations: { book: true },
      });
      console.log(`[INGEST] Chapter found: ${chapter?.id}, bookTenantId: ${chapter?.book?.tenantId}`);
    } catch (e: any) {
      console.error('[INGEST] ERROR finding chapter:', e.message, e.stack);
      throw e;
    }

    if (!chapter || chapter.book.tenantId !== tenantId) {
      console.error(`[INGEST] Chapter not found or tenant mismatch. chapter=${!!chapter}, expected tenantId=${tenantId}`);
      throw new NotFoundException('Chapter not found');
    }

    // Step 2: Extract text from PDF
    let text: string;
    try {
      console.log('[INGEST] Extracting text from PDF...');
      text = await this.pdfExtraction.extractText(fileBuffer);
      console.log(`[INGEST] Extracted text length: ${text.length}`);
    } catch (e: any) {
      console.error('[INGEST] ERROR extracting PDF text:', e.message, e.stack);
      throw e;
    }

    // Step 3: Chunk text
    let segments: string[];
    try {
      segments = this.chunking.semanticChunk(text);
      console.log(`[INGEST] Created ${segments.length} chunks`);
    } catch (e: any) {
      console.error('[INGEST] ERROR chunking text:', e.message, e.stack);
      throw e;
    }

    // Step 4: Embed chunks
    let embeddings: number[][];
    try {
      console.log(`[INGEST] Embedding ${segments.length} chunks...`);
      embeddings = await this.embedding.embedTexts(segments);
      console.log(`[INGEST] Got ${embeddings.length} embeddings, first dim=${embeddings[0]?.length ?? 0}`);
    } catch (e: any) {
      console.error('[INGEST] ERROR embedding chunks:', e.message, e.stack);
      throw e;
    }

    // Step 5: Clear old chunks and save new ones
    try {
      await this.chunkRepository.delete({ chapterId });
      console.log('[INGEST] Old chunks deleted');

      const entities = segments.map((contentText, index) =>
        this.chunkRepository.create({
          chapterId,
          contentText,
          embedding: embeddings[index] ?? null,
        }),
      );
      await this.chunkRepository.save(entities);
      console.log(`[INGEST] Saved ${entities.length} chunks to DB successfully`);

      return { chunksCreated: entities.length };
    } catch (e: any) {
      console.error('[INGEST] ERROR saving chunks to DB:', e.message, e.stack);
      throw e;
    }
  }

  async semanticSearch(tenantId: string, dto: SemanticSearchDto) {
    if (dto.chapterId) {
      const count = await this.chunkRepository.count({
        where: { chapterId: dto.chapterId },
      });
      if (count === 0) {
        // Auto-seed default chunks
        const segments = this.chunking.semanticChunk(DEFAULT_TEXT);
        let embeddings: number[][] = [];
        try {
          embeddings = await this.embedding.embedTexts(segments);
        } catch (e) {
          console.warn('Seeding: Embedding failed, using null embeddings', e);
        }
        const entities = segments.map((contentText, index) =>
          this.chunkRepository.create({
            chapterId: dto.chapterId,
            contentText,
            embedding: embeddings[index] ?? null,
          }),
        );
        await this.chunkRepository.save(entities);
      }
    }

    try {
      const queryEmbedding = await this.embedding.embedQuery(dto.query);
      return await this.vectorSearch.search(tenantId, queryEmbedding, {
        chapterId: dto.chapterId,
        bookId: dto.bookId,
        topK: dto.topK,
      });
    } catch (err: any) {
      console.warn('Embedding search failed, falling back to database text search:', err.message || err);

      const qb = this.chunkRepository
        .createQueryBuilder('chunk')
        .innerJoin('chunk.chapter', 'chapter')
        .innerJoin('chapter.book', 'book')
        .select('chunk.id', 'id')
        .addSelect('chunk.chapter_id', 'chapterId')
        .addSelect('chapter.title', 'chapterTitle')
        .addSelect('chunk.content_text', 'contentText')
        .addSelect('0.5', 'similarity')
        .where('book.tenant_id = :tenantId', { tenantId });

      if (dto.chapterId) {
        qb.andWhere('chunk.chapter_id = :chapterId', { chapterId: dto.chapterId });
      }
      if (dto.bookId) {
        qb.andWhere('chapter.book_id = :bookId', { bookId: dto.bookId });
      }

      const words = dto.query.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 0) {
        qb.andWhere(
          '(' + words.map((_, i) => `chunk.content_text ILIKE :word${i}`).join(' OR ') + ')',
          words.reduce((acc, w, i) => ({ ...acc, [`word${i}`]: `%${w}%` }), {}),
        );
      }

      const rows = await qb.limit(dto.topK ?? 5).getRawMany<VectorSearchResult>();

      if (rows.length === 0 && dto.chapterId) {
        return this.chunkRepository
          .createQueryBuilder('chunk')
          .innerJoin('chunk.chapter', 'chapter')
          .select('chunk.id', 'id')
          .addSelect('chunk.chapter_id', 'chapterId')
          .addSelect('chapter.title', 'chapterTitle')
          .addSelect('chunk.content_text', 'contentText')
          .addSelect('0.1', 'similarity')
          .where('chunk.chapter_id = :chapterId', { chapterId: dto.chapterId })
          .limit(dto.topK ?? 5)
          .getRawMany<VectorSearchResult>();
      }

      return rows;
    }
  }

  private getMockResponse(sources: any[], query: string) {
    const qLower = query.toLowerCase();
    let bestChunk = '';
    if (sources && sources.length > 0) {
      const matchingChunk = sources.find((s) => {
        const text = s.contentText.toLowerCase();
        return qLower.split(/\s+/).some((word) => word.length > 3 && text.includes(word));
      });
      bestChunk = matchingChunk ? matchingChunk.contentText : sources[0].contentText;
    } else {
      bestChunk = DEFAULT_TEXT;
    }

    let answer = `[Offline Mode - API Key Not Configured]\n\n`;
    if (
      qLower.includes('hi') ||
      qLower.includes('hello') ||
      qLower.includes('hey')
    ) {
      answer += `Hello! I am your AI Teaching Assistant.

The backend is currently running in **Offline Fallback Mode** because a valid Gemini API key is not configured in your \`backend/.env\` file.

To enable live AI-generated responses, please generate a free API key from [Google AI Studio](https://aistudio.google.com/) and update the \`OPENAI_API_KEY\` variable in your \`backend/.env\` file.

Here is the start of the textbook chapter:
---
${bestChunk}
---`;
    } else {
      answer += `I searched the textbook chapter for your query: "${query}".

*(Note: The AI is running in **Offline Fallback Mode** due to an invalid/missing API key in \`backend/.env\`. Please add a valid Gemini key to enable live AI reasoning.)*

Here is the matching textbook excerpt:
---
${bestChunk}
---`;
    }

    return {
      answer,
      sources: sources || [],
    };
  }

  async chat(tenantId: string, dto: RagChatDto) {
    const topK = 5;
    const searchResults = await this.semanticSearch(tenantId, {
      query: dto.query,
      chapterId: dto.chapterId,
      bookId: dto.bookId,
      topK,
    });

    if (!this.apiKey) {
      return this.getMockResponse(searchResults, dto.query);
    }

    const contextText = searchResults
      .map(
        (r, i) =>
          `[Source ${i + 1} - Chapter: ${r.chapterTitle}]\n${r.contentText}`,
      )
      .join('\n\n');

    const systemPrompt = `You are a helpful and knowledgeable AI Teaching Assistant.
Your goal is to answer the user's questions about the textbook content.

Use the retrieved textbook content below to formulate your response:
---
${contextText || 'No relevant textbook content found.'}
---

Instructions:
1. Prioritize using the retrieved textbook content to formulate your response.
2. If citing facts from the retrieved textbook content, reference the source by appending e.g. "[Source 1]" to the end of the sentence.
3. If the textbook content is empty or does not contain the answer, you can use your general knowledge, but politely explain that this information was not found in the textbook chapter.
4. Keep the response clear, structured, encouraging, and highly educational.`;

    if (!this.isGemini && this.openaiClient) {
      // Use OpenAI SDK
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
        ];

        if (dto.history && dto.history.length > 0) {
          const limitedHistory = dto.history.slice(-10);
          for (const msg of limitedHistory) {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content,
            });
          }
        }

        messages.push({ role: 'user', content: dto.query });

        const completion = await this.openaiClient.chat.completions.create({
          model: this.chatModel,
          messages,
          temperature: 0.7,
        });

        const answer = completion.choices[0]?.message?.content?.trim() ?? '';

        return {
          answer,
          sources: searchResults,
        };
      } catch (err: any) {
        console.warn('OpenAI API call failed, falling back to mock:', err);
        return this.getMockResponse(searchResults, dto.query);
      }
    } else {
      // Use Native Gemini REST API
      const contents: any[] = [];

      if (dto.history && dto.history.length > 0) {
        const limitedHistory = dto.history.slice(-10);
        for (const msg of limitedHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: dto.query }],
      });

      const modelName = this.chatModel.startsWith('models/')
        ? this.chatModel
        : `models/${this.chatModel}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
            },
          }),
        });

        const data = (await response.json()) as any;

        if (!response.ok || data.error) {
          const errorMsg =
            data.error?.message || JSON.stringify(data.error || data);
          throw new Error(errorMsg);
        }

        const answer =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

        return {
          answer,
          sources: searchResults,
        };
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to mock:', err);
        return this.getMockResponse(searchResults, dto.query);
      }
    }
  }
}
