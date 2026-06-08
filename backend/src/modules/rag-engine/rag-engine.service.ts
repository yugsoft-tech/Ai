import { Injectable, NotFoundException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

export interface StructuredContentBlock {
  blockType: string;
  content: any;
  pageNumber?: number;
}

export interface StructuredChapter {
  chapterNumber: number | string;
  chapterTitle: string;
  pageRange?: { start: number; end: number };
  contentBlocks: StructuredContentBlock[];
}

export interface StructuredUnit {
  unitTitle: string;
  chapters: StructuredChapter[];
}

export interface StructuredBookData {
  bookTitle?: string;
  units: StructuredUnit[];
}
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Book } from '../../database/entities/book.entity';
import { BookChunk } from '../../database/entities/book-chunk.entity';
import { Chapter } from '../../database/entities/chapter.entity';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { PdfExtractionService } from './services/pdf-extraction.service';
import { VectorSearchService } from './services/vector-search.service';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { VectorSearchResult } from './services/vector-search.service';

const MASTER_STRUCTURE_PROMPT = `You are an expert Educational Data Structurer. Convert the raw OCR text into a highly structured JSON format for a PostgreSQL RAG database.
RULES: Clean OCR errors, extract page numbers, maintain strict chapter boundaries, and categorize blocks into: narrative, vocabulary, exercise_mcq, exercise_truefalse, exercise_shortanswer, exercise_fillblanks, grammar, activity.

EXPECTED SCHEMA:
{
  "bookTitle": "...",
  "units": [{ "unitTitle": "...", "chapters": [{ "chapterNumber": 1, "chapterTitle": "...", "pageRange": { "start": 5, "end": 10 }, "contentBlocks": [{ "blockType": "...", "content": "...", "pageNumber": 5 }] }] }]
}

INPUT TEXT:
{RAW_OCR_TEXT}`;

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
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(BookChunk)
    private readonly chunkRepository: Repository<BookChunk>,
    private readonly pdfExtraction: PdfExtractionService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly vectorSearch: VectorSearchService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
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
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId },
      relations: { book: true },
    });
    if (!chapter || chapter.book.tenantId !== tenantId) {
      throw new NotFoundException('Chapter not found');
    }

    const pages = await this.pdfExtraction.extractText(fileBuffer);
    const segments = this.chunking.semanticChunk(pages);
    const embeddings = await this.embedding.embedTexts(segments.map(s => s.contentText));

    await this.chunkRepository.delete({ chapterId });

    const entities = segments.map((segment, index) =>
      this.chunkRepository.create({
        chapterId,
        contentText: segment.contentText,
        pageNumber: segment.pageNumber,
        embedding: embeddings[index] ?? null,
      }),
    );
    await this.chunkRepository.save(entities);

    return { chunksCreated: entities.length };
  }

  async semanticSearch(tenantId: string, dto: SemanticSearchDto) {
    if (dto.chapterId) {
      const count = await this.chunkRepository.count({
        where: { chapterId: dto.chapterId },
      });
      if (count === 0) {
        // Auto-seed default chunks
        const segments = this.chunking.semanticChunk([{ pageNumber: 1, text: DEFAULT_TEXT }]);
        let embeddings: number[][] = [];
        try {
          embeddings = await this.embedding.embedTexts(segments.map(s => s.contentText));
        } catch (e) {
          console.warn('Seeding: Embedding failed, using null embeddings', e);
        }
        const entities = segments.map((segment, index) =>
          this.chunkRepository.create({
            chapterId: dto.chapterId,
            contentText: segment.contentText,
            pageNumber: segment.pageNumber,
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
        .addSelect('chunk.chapterId', 'chapterId')
        .addSelect('chapter.title', 'chapterTitle')
        .addSelect('chunk.contentText', 'contentText')
        .addSelect('chunk.pageNumber', 'pageNumber')
        .addSelect('0.5', 'similarity')
        .where('book.tenantId = :tenantId', { tenantId });

      if (dto.chapterId) {
        qb.andWhere('chunk.chapterId = :chapterId', { chapterId: dto.chapterId });
      }
      if (dto.bookId) {
        qb.andWhere('chapter.bookId = :bookId', { bookId: dto.bookId });
      }

      const words = dto.query.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 0) {
        qb.andWhere(
          '(' + words.map((_, i) => `chunk.contentText ILIKE :word${i}`).join(' OR ') + ')',
          words.reduce((acc, w, i) => ({ ...acc, [`word${i}`]: `%${w}%` }), {}),
        );
      }

      const rows = await qb.limit(dto.topK ?? 5).getRawMany<VectorSearchResult>();

      if (rows.length === 0 && dto.chapterId) {
        return this.chunkRepository
          .createQueryBuilder('chunk')
          .innerJoin('chunk.chapter', 'chapter')
          .select('chunk.id', 'id')
          .addSelect('chunk.chapterId', 'chapterId')
          .addSelect('chapter.title', 'chapterTitle')
          .addSelect('chunk.contentText', 'contentText')
          .addSelect('chunk.pageNumber', 'pageNumber')
          .addSelect('0.1', 'similarity')
          .where('chunk.chapterId = :chapterId', { chapterId: dto.chapterId })
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

  /**
   * 🚀 NEW METHOD: Pur PDF upload karke AI se automatic Chapter-wise chunking karwane ke liye
   */
  async processAndIngestTextbook(
    tenantId: string,
    bookId: string,
    pdfBuffer: Buffer,
  ): Promise<{ chaptersCreated: number; chunksCreated: number }> {
    
    // 1. Book ko verify karein
    const book = await this.bookRepository.findOne({ where: { id: bookId, tenantId } });
    if (!book) {
      throw new NotFoundException('Book not found for this tenant');
    }

    console.log(`🚀 Starting AI-driven ingestion for Book: ${book.title}`);

    // 1. TEXT EXTRACTION & FORMATTING
    const extractedPages: any[] = await this.pdfExtraction.extractText(pdfBuffer);
    if (!extractedPages || !Array.isArray(extractedPages) || extractedPages.length === 0) {
      throw new BadRequestException('Could not extract text from PDF.');
    }

    const actualParsedText = extractedPages
      .map((page) => page.text || page.contentText || '')
      .join('\n\n')
      .trim();

    if (actualParsedText.length < 100) {
      throw new BadRequestException('Extracted text is too short. Is it a scanned image?');
    }

    // 2. LLM JSON STRUCTURING OR FALLBACK
    const finalPrompt = MASTER_STRUCTURE_PROMPT.replace('{RAW_OCR_TEXT}', actualParsedText);
    let structuredData: StructuredBookData | null = null;

    try {
      let structuredJsonString = '';
      if (!this.isGemini && this.openaiClient) {
        // --- OPENAI PATH ---
        const completion = await this.openaiClient.chat.completions.create({
          model: this.chatModel,
          response_format: { type: 'json_object' }, // 🔥 Force JSON output
          messages: [{ role: 'user', content: finalPrompt }],
          temperature: 0.1, // Low temp for strict structure
        });
        structuredJsonString = completion.choices[0]?.message?.content ?? '{}';
      } else if (this.apiKey) {
        // --- GEMINI PATH ---
        const modelName = this.chatModel.startsWith('models/') ? this.chatModel : `models/${this.chatModel}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json', // 🔥 Force JSON output
              temperature: 0.1,
            },
          }),
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message || 'Gemini API failed');
        
        structuredJsonString = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      } else {
        throw new Error('No API Key configured.');
      }

      structuredData = JSON.parse(structuredJsonString);
    } catch (err: any) {
      console.warn('⚠️ AI Structuring failed (Invalid API Key or Timeout). Falling back to basic chunking...', err.message);
      
      // FALLBACK MODE: Treat entire text as one chapter and break into basic blocks
      const fallbackBlocks: StructuredContentBlock[] = actualParsedText
        .split(/\n\n+/) // Split by paragraphs
        .filter(p => p.trim().length > 0)
        .map((p, i) => ({
          blockType: 'narrative',
          content: p.trim(),
          pageNumber: 1
        }));

      structuredData = {
        bookTitle: book.title,
        units: [
          {
            unitTitle: "Default Unit",
            chapters: [
              {
                chapterNumber: 1,
                chapterTitle: "Chapter 1: Extracted Content",
                contentBlocks: fallbackBlocks
              }
            ]
          }
        ]
      };
    }

    // 3. TYPEORM DATABASE INGESTION (Vector Search Ready)
    let totalChapters = 0;
    let totalChunks = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Purane chunks delete kar dein (Re-upload case ke liye) - NOW SAFELY INSIDE TRANSACTION
      const existingChapters = await queryRunner.manager.find(Chapter, { where: { bookId: book.id } });
      for (const ch of existingChapters) {
        await queryRunner.manager.delete(BookChunk, { chapterId: ch.id });
      }
      await queryRunner.manager.delete(Chapter, { bookId: book.id });

      if (structuredData && structuredData.units && Array.isArray(structuredData.units)) {
        for (const unit of structuredData.units) {
          if (unit.chapters && Array.isArray(unit.chapters)) {
            for (const chapterData of unit.chapters) {
              
              // A. Chapter Create karein
              const newChapter = queryRunner.manager.create(Chapter, {
                bookId: book.id,
                title: `${chapterData.chapterNumber || ''}. ${chapterData.chapterTitle || 'Untitled'}`.trim(),
              });
              const savedChapter = await queryRunner.manager.save(newChapter);
              totalChapters++;

              // B. Content Blocks ko Chunks mein badlein
              const chunkEntities = [];
              const textsToEmbed: string[] = [];

              if (chapterData.contentBlocks && Array.isArray(chapterData.contentBlocks)) {
                for (const block of chapterData.contentBlocks) {
                  // Cleanly stringify if content is an object or array
                  let contentString = '';
                  if (typeof block.content === 'string') {
                    contentString = block.content;
                  } else {
                    contentString = JSON.stringify(block.content);
                  }

                  const enrichedText = `[${block.blockType || 'content'}]\n${contentString}`;
                  
                  textsToEmbed.push(enrichedText);
                  chunkEntities.push(
                    queryRunner.manager.create(BookChunk, {
                      chapterId: savedChapter.id,
                      contentText: enrichedText,
                      pageNumber: block.pageNumber || null,
                    })
                  );
                }
              }

              // C. Embeddings generate karein (Batch mein)
              if (textsToEmbed.length > 0) {
                try {
                  const embeddings = await this.embedding.embedTexts(textsToEmbed);
                  chunkEntities.forEach((entity, index) => {
                    entity.embedding = embeddings[index];
                  });
                } catch (e) {
                  console.warn(`⚠️ Embedding generation failed for chapter ${savedChapter.title}.`);
                }
              }

              // D. Chunks ko DB mein save karein
              if (chunkEntities.length > 0) {
                await queryRunner.manager.save(chunkEntities);
                totalChunks += chunkEntities.length;
              }
              
              console.log(`✅ Saved Chapter: ${savedChapter.title} (${chunkEntities.length} chunks)`);
            }
          }
        }
      }
      
      await queryRunner.commitTransaction();
      console.log(`🎉 Ingestion Complete! Chapters: ${totalChapters}, Chunks: ${totalChunks}`);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error('❌ DB Ingestion failed:', err.message);
      throw new ServiceUnavailableException('Failed to save structured data to database.');
    } finally {
      await queryRunner.release();
    }

    return { chaptersCreated: totalChapters, chunksCreated: totalChunks };
  }
}
