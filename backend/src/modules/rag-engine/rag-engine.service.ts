import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import { PageText } from './services/pdf-extraction.service';
import { ChapterDetectionService } from './services/chapter-detection.service';

// ─── Public interfaces (used by controller / other services) ────────────────

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

// ─── AI-extracted chapter identification interface ───────────────────────────

/**
 * This is what we ask Gemini to return for every distinct chapter/story/poem
 * it can identify in the raw OCR text.
 */
interface IdentifiedChapter {
  title: string;
  unitTitle: string;
  chapterNumber: number;
  /** Key vocabulary words for this chapter – used for keyword-based search fallback */
  approximateKeywords: string[];
  /** PDF page where this chapter starts (from TOC or header detection) */
  startPage?: number;
}

// ─── Offline-mode fallback text ─────────────────────────────────────────────

const DEFAULT_TEXT = `The fundamental principles of artificial intelligence are rooted in the concept of machine learning, where systems improve their performance on a given task by analyzing vast amounts of data.
Neural networks mimic the human brain's interconnected neuron structure, allowing complex pattern recognition and deep learning capabilities.
In natural language processing (NLP), models use these networks to understand context, semantics, and syntax. This forms the basis for modern conversational agents and generative models.
Another crucial aspect is reinforcement learning, where an agent learns to make decisions by performing actions in an environment to maximize a reward signal. This approach has led to significant breakthroughs in robotics and complex game playing.
The integration of these technologies into educational software enables personalized learning pathways, instant feedback, and adaptive testing mechanisms that cater to the unique needs of each student.`;

// ─── Gemini TOC Extraction prompt ────────────────────────────────────────────

const TOC_EXTRACTION_PROMPT = `You are an expert educational textbook parser and chapter boundary detector.

Your ONLY task: Read the OCR text below and produce ONE JSON array entry for EACH individual chapter, story, poem, exercise, or test paper you find.

⚠️ CRITICAL — READ CAREFULLY:
- A "unit" (e.g. "Unit-1 My Family & Me") is NOT a chapter. It is a grouping.
- Each STORY, POEM, LESSON, or TEST PAPER inside a unit = its own separate array entry.
- If a book has 12 stories/poems/chapters, you MUST return exactly 12 entries in the array.
- DO NOT collapse multiple stories into one entry.
- DO NOT return unit headings as chapter entries.
- For children's textbooks: every story title or poem title = one chapter.

RULES:
1. chapterNumber = sequential integer starting at 1 (not the book's printed number, just your index).
2. title = the exact story/poem/lesson title as it appears in the text.
3. unitTitle = the unit this chapter belongs to (e.g. "Unit-1 My Family & Me"). Use "Complete Book" if no units.
4. approximateKeywords = 5–8 unique vocabulary words from that chapter's content.
5. Return ONLY a valid JSON array. No markdown. No explanation. No trailing commas.

EXAMPLE — a book with Unit-1 containing 3 stories and Unit-2 containing 2 stories gives FIVE entries:
[
  { "title": "My Family",         "unitTitle": "Unit-1 My Family & Me", "chapterNumber": 1, "approximateKeywords": ["family", "mother", "father"] },
  { "title": "Meet My Best Friend","unitTitle": "Unit-1 My Family & Me", "chapterNumber": 2, "approximateKeywords": ["friend", "play", "school"] },
  { "title": "I Can",              "unitTitle": "Unit-1 My Family & Me", "chapterNumber": 3, "approximateKeywords": ["run", "jump", "swim"] },
  { "title": "Jumbo's Friends",    "unitTitle": "Unit-2 Life Around Us", "chapterNumber": 4, "approximateKeywords": ["elephant", "jungle", "animals"] },
  { "title": "The Little Sparrow", "unitTitle": "Unit-2 Life Around Us", "chapterNumber": 5, "approximateKeywords": ["sparrow", "bird", "nest"] }
]

The text is split by page markers like "--- PAGE 5 ---".
Use the INDEX/CONTENTS pages (usually early pages) to find all story/poem titles and their page numbers.
Then confirm titles also appear in the body text on those pages.

INDEX / TOC PAGES:
{INDEX_OCR_TEXT}

FULL BOOK TEXT (page-marked, up to 30000 characters):
{RAW_OCR_TEXT}

Return ONLY the JSON array. Each entry may optionally include "startPage" (integer page number from the TOC).`;

// ─── Context Slicing prompt ───────────────────────────────────────────────────

/**
 * Builds a prompt that asks Gemini to slice the full text into chapter blobs.
 * We only use this when the text is short enough to fit in context.
 * For large books, we use keyword-based heuristic slicing instead.
 */
function buildSlicingPrompt(
  chapters: IdentifiedChapter[],
  fullText: string,
): string {
  const chapterList = chapters
    .map(
      (c) =>
        `${c.chapterNumber}. "${c.title}" (keywords: ${c.approximateKeywords.slice(0, 3).join(', ')})`,
    )
    .join('\n');

  return `You are a precise text segmentation engine.

The following chapters have been identified in this textbook:
${chapterList}

Below is the full extracted text. Your task: split the text into segments — one per chapter.

Return a JSON object where each KEY is the chapterNumber (as a string, e.g. "1") and each VALUE is the raw text belonging ONLY to that chapter.

RULES:
- Every character of the full text must belong to exactly one chapter.
- Do NOT summarize or alter the text. Copy it verbatim.
- Return ONLY the JSON object. No markdown.

FULL TEXT:
${fullText.slice(0, 28000)}

Return ONLY the JSON object.`;
}

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
    private readonly chapterDetection: ChapterDetectionService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.apiKey = this.configService.get<string>('openai.apiKey') ?? '';
    this.chatModel =
      this.configService.get<string>('openai.chatModel') ?? 'gemini-2.5-flash';
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

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING PUBLIC API – ingestPdf, semanticSearch, chat  (UNCHANGED)
  // ═══════════════════════════════════════════════════════════════════════════

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

    // Step 2: Extract pages
    const pages = await this.pdfExtraction.extractText(fileBuffer);

    // Step 3: Chunk text
    let subChunks: ReturnType<ChunkingService['semanticChunk']>;
    try {
      subChunks = this.chunking.semanticChunk(pages);
      console.log(`[INGEST] Created ${subChunks.length} chunks`);
    } catch (e: any) {
      console.error('[INGEST] ERROR chunking text:', e.message, e.stack);
      throw e;
    }

    // Step 4: Embed chunks
    const embeddings = await this.embedding.embedTexts(
      subChunks.map((s) => s.contentText),
    );

    // Step 5: Clear old chunks and save new ones
    try {
      await this.chunkRepository.delete({ chapterId });
      console.log('[INGEST] Old chunks deleted');

      const entities = subChunks.map((chunk, index) =>
        this.chunkRepository.create({
          chapterId,
          contentText: chunk.contentText,
          pageNumber: chunk.pageNumber,
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
        console.warn(
          `[RAG] Chapter ${dto.chapterId} has no ingested content. Returning empty context.`,
        );
        return [];
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
      console.warn(
        'Embedding search failed, falling back to database text search:',
        err.message || err,
      );

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
        qb.andWhere('chunk.chapterId = :chapterId', {
          chapterId: dto.chapterId,
        });
      }
      if (dto.bookId) {
        qb.andWhere('chapter.bookId = :bookId', { bookId: dto.bookId });
      }

      const words = dto.query.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 0) {
        qb.andWhere(
          '(' +
            words.map((_, i) => `chunk.contentText ILIKE :word${i}`).join(' OR ') +
            ')',
          words.reduce((acc, w, i) => ({ ...acc, [`word${i}`]: `%${w}%` }), {}),
        );
      }

      const rows = await qb
        .limit(dto.topK ?? 5)
        .getRawMany<VectorSearchResult>();

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

        const answer =
          completion.choices[0]?.message?.content?.trim() ?? '';

        return { answer, sources: searchResults };
      } catch (err: any) {
        console.warn('OpenAI API call failed, falling back to mock:', err);
        return this.getMockResponse(searchResults, dto.query);
      }
    } else {
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

      contents.push({ role: 'user', parts: [{ text: dto.query }] });

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
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.7 },
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

        return { answer, sources: searchResults };
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to mock:', err);
        return this.getMockResponse(searchResults, dto.query);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPGRADED: processAndIngestTextbook  – AI-DRIVEN CHAPTER SEGMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Full AI-driven ingestion pipeline:
   *   STEP 1 → TOC Extraction  (Gemini identifies chapter boundaries)
   *   STEP 2 → Context Slicing (text is split per chapter)
   *   STEP 3 → Sub-chunking + Batched Embeddings (saved to PostgreSQL)
   *   STEP 4 → Bulletproof Failsafe (heuristic fallback on any AI failure)
   */
  async processAndIngestTextbook(
    tenantId: string,
    bookId: string,
    pdfBuffer: Buffer,
  ): Promise<{ chaptersCreated: number; chunksCreated: number }> {

    // ── Verify book ownership ──────────────────────────────────────────────
    const book = await this.bookRepository.findOne({
      where: { id: bookId, tenantId },
    });
    if (!book) {
      throw new NotFoundException('Book not found for this tenant');
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 [INGEST] Starting AI-driven ingestion`);
    console.log(`   Book  : "${book.title}" (${bookId})`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`${'═'.repeat(60)}\n`);

    // ── Extract text from PDF via OCR ──────────────────────────────────────
    console.log('📄 [STEP 0] Extracting text from PDF via OCR...');
    const extractedPages: PageText[] =
      await this.pdfExtraction.extractText(pdfBuffer);

    if (!extractedPages?.length) {
      throw new BadRequestException('Could not extract text from PDF.');
    }

    const fullRawText = extractedPages
      .map((p) => p.text)
      .join('\n\n')
      .trim();

    if (fullRawText.length < 100) {
      throw new BadRequestException(
        'Extracted text is too short. Is the PDF a scanned image without OCR data?',
      );
    }

    console.log(
      `   ✅ OCR complete – ${extractedPages.length} pages, ${fullRawText.length} characters\n`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // STEP 1: AI STRUCTURAL ANALYSIS – TOC / Chapter Boundary Extraction
    // ══════════════════════════════════════════════════════════════════════
    console.log('🤖 [STEP 1] AI Structural Analysis – TOC Extraction...');

    let identifiedChapters: IdentifiedChapter[] = [];

    try {
      identifiedChapters = await this.extractChapterStructure(
        extractedPages,
        fullRawText,
      );

      if (!identifiedChapters.length) {
        throw new Error('AI returned an empty chapter list.');
      }

      identifiedChapters = this.chapterDetection.enrichWithStartPages(
        identifiedChapters,
        extractedPages,
      );

      // Calibrate TOC page numbers to PDF page indices when possible
      if (identifiedChapters.some((c) => c.startPage != null)) {
        identifiedChapters = this.chapterDetection.calibratePageNumbers(
          identifiedChapters,
          extractedPages,
        );
      }

      // Reject if AI returned suspiciously few chapters for a multi-unit book
      const unitCount = this.chapterDetection.countUnitMarkers(fullRawText);
      const expectedMin = this.chapterDetection.estimateExpectedChapterCount(
        extractedPages,
        fullRawText,
      );

      if (
        identifiedChapters.length === 1 &&
        unitCount >= 2
      ) {
        throw new Error(
          `AI returned 1 chapter but ${unitCount} units detected in text.`,
        );
      }

      if (
        expectedMin >= 3 &&
        identifiedChapters.length < expectedMin * 0.5
      ) {
        throw new Error(
          `AI returned ${identifiedChapters.length} chapters but ~${expectedMin} expected from text structure.`,
        );
      }

      console.log(
        `   ✅ TOC Extraction complete – ${identifiedChapters.length} chapters identified:`,
      );
      identifiedChapters.forEach((c) =>
        console.log(
          `      Ch.${c.chapterNumber}: "${c.title}" [${c.unitTitle}]${c.startPage ? ` (p.${c.startPage})` : ''}`,
        ),
      );
      console.log('');
    } catch (err: any) {
      console.warn(`   ⚠️  TOC Extraction failed: ${err.message}`);
      console.log('   🔄 Trying regex/page-based chapter detection...\n');
    }

    // Always run heuristic detection and prefer whichever finds MORE chapters
    const heuristicChapters = this.chapterDetection.detectChapters(
      extractedPages,
      fullRawText,
    );

    if (heuristicChapters.length > identifiedChapters.length) {
      console.log(
        `   🔄 Heuristic detection found more chapters (${heuristicChapters.length} vs AI ${identifiedChapters.length}) – using heuristic result`,
      );
      const calibrated = this.chapterDetection.calibratePageNumbers(
        heuristicChapters,
        extractedPages,
      );
      identifiedChapters = calibrated.map((c) => ({
        title: c.title,
        unitTitle: c.unitTitle,
        chapterNumber: c.chapterNumber,
        approximateKeywords: c.approximateKeywords,
        startPage: c.startPage,
      }));
      console.log(
        `   ✅ Using ${identifiedChapters.length} chapters:`,
      );
      identifiedChapters.forEach((c) =>
        console.log(
          `      Ch.${c.chapterNumber}: "${c.title}" [${c.unitTitle}]${c.startPage ? ` (p.${c.startPage})` : ''}`,
        ),
      );
      console.log('');
    } else if (identifiedChapters.length === 0 && heuristicChapters.length > 0) {
      const calibrated = this.chapterDetection.calibratePageNumbers(
        heuristicChapters,
        extractedPages,
      );
      identifiedChapters = calibrated.map((c) => ({
        title: c.title,
        unitTitle: c.unitTitle,
        chapterNumber: c.chapterNumber,
        approximateKeywords: c.approximateKeywords,
        startPage: c.startPage,
      }));
      console.log(
        `   ✅ Heuristic detection found ${identifiedChapters.length} chapters:`,
      );
      identifiedChapters.forEach((c) =>
        console.log(
          `      Ch.${c.chapterNumber}: "${c.title}" [${c.unitTitle}]${c.startPage ? ` (p.${c.startPage})` : ''}`,
        ),
      );
      console.log('');
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2: DYNAMIC CONTEXT SLICING
    // ══════════════════════════════════════════════════════════════════════
    console.log('✂️  [STEP 2] Dynamic Context Slicing...');

    /**
     * chapterTextMap: chapterNumber → raw text string for that chapter.
     * Built by AI slicing if possible, otherwise by keyword heuristics.
     */
    let chapterTextMap: Map<number, string> = new Map();

    if (identifiedChapters.length > 0) {
      const hasPageRanges = identifiedChapters.some((c) => c.startPage != null);

      if (hasPageRanges) {
        chapterTextMap = this.chapterDetection.sliceByPageRanges(
          identifiedChapters,
          extractedPages,
        );
        console.log(
          `   ✅ Page-range slicing complete – ${chapterTextMap.size} chapter text blocks produced\n`,
        );
      }

      if (chapterTextMap.size === 0) {
        try {
          chapterTextMap = await this.sliceTextByChapters(
            identifiedChapters,
            fullRawText,
          );
          console.log(
            `   ✅ Context slicing complete – ${chapterTextMap.size} chapter text blocks produced\n`,
          );
        } catch (sliceErr: any) {
          console.warn(
            `   ⚠️  AI slicing failed: ${sliceErr.message} – falling back to keyword heuristic slicing`,
          );
          chapterTextMap = this.heuristicKeywordSlice(
            identifiedChapters,
            fullRawText,
          );
          console.log(
            `   🔄 Heuristic slicing produced ${chapterTextMap.size} blocks\n`,
          );
        }
      }
    } else {
      // No chapters identified at all – treat the entire book as ch.1
      console.log(
        '   ⚠️  No chapters identified – treating entire book as a single chapter\n',
      );
      identifiedChapters = [
        {
          title: book.title,
          unitTitle: 'Complete Book',
          chapterNumber: 1,
          approximateKeywords: [],
        },
      ];
      chapterTextMap.set(1, fullRawText);
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3: SEMANTIC SUB-CHUNKING + BATCHED EMBEDDINGS → POSTGRES
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      '💾 [STEP 3] Semantic Sub-Chunking + Batched Embeddings → PostgreSQL...',
    );

    let totalChapters = 0;
    let totalChunks = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── Delete old chapters + chunks for this book ──────────────────────
      const existingChapters = await queryRunner.manager.find(Chapter, {
        where: { bookId: book.id },
      });
      for (const ch of existingChapters) {
        await queryRunner.manager.delete(BookChunk, { chapterId: ch.id });
      }
      await queryRunner.manager.delete(Chapter, { bookId: book.id });
      console.log(
        `   🗑️  Cleared ${existingChapters.length} old chapter(s) from DB`,
      );

      // ── Process each identified chapter ────────────────────────────────
      for (const identified of identifiedChapters) {
        const chapterText =
          chapterTextMap.get(identified.chapterNumber) ?? fullRawText;

        // 3a. Save Chapter entity
        const chapterEntity = queryRunner.manager.create(Chapter, {
          bookId: book.id,
          title: `${identified.chapterNumber}. ${identified.title}`.trim(),
          unitTitle: identified.unitTitle || null,
          chapterNumber: identified.chapterNumber,
          approximateKeywords: identified.approximateKeywords ?? [],
        });
        const savedChapter = await queryRunner.manager.save(chapterEntity);
        totalChapters++;

        console.log(
          `\n   📖 Chapter ${identified.chapterNumber}: "${identified.title}"`,
        );
        console.log(
          `      Unit   : ${identified.unitTitle || '—'}`,
        );
        console.log(
          `      Text   : ${chapterText.length} chars`,
        );

        // 3b. Semantic sub-chunking – use real page numbers when available
        let pagesForChunking: PageText[];
        if (identified.startPage != null) {
          const nextChapter = identifiedChapters.find(
            (c) => c.chapterNumber === identified.chapterNumber + 1,
          );
          const endPage = nextChapter?.startPage
            ? nextChapter.startPage - 1
            : extractedPages.length;
          pagesForChunking = extractedPages.filter(
            (p) =>
              p.pageNumber >= identified.startPage! &&
              p.pageNumber <= endPage,
          );
        } else {
          pagesForChunking = [
            { pageNumber: identified.chapterNumber, text: chapterText },
          ];
        }

        const subChunks = this.chunking.semanticChunk(pagesForChunking);

        console.log(`      Chunks : ${subChunks.length}`);

        if (subChunks.length === 0) {
          console.warn(`      ⚠️  No sub-chunks generated – skipping`);
          continue;
        }

        // 3c. Batch embed in groups of 100 (Gemini API limit)
        const EMBED_BATCH_SIZE = 100;
        const allEmbeddings: (number[] | null)[] = new Array(
          subChunks.length,
        ).fill(null);

        for (
          let batchStart = 0;
          batchStart < subChunks.length;
          batchStart += EMBED_BATCH_SIZE
        ) {
          const batchEnd = Math.min(
            batchStart + EMBED_BATCH_SIZE,
            subChunks.length,
          );
          const batchTexts = subChunks
            .slice(batchStart, batchEnd)
            .map((c) => c.contentText);

          console.log(
            `      🔢 Embedding batch [${batchStart + 1}–${batchEnd}] of ${subChunks.length}...`,
          );

          try {
            const batchEmbeddings = await this.embedding.embedTexts(batchTexts);
            for (let k = 0; k < batchEmbeddings.length; k++) {
              allEmbeddings[batchStart + k] = batchEmbeddings[k];
            }
          } catch (embedErr: any) {
            console.warn(
              `      ⚠️  Embedding batch failed (will save null): ${embedErr.message}`,
            );
          }
        }

        // 3d. Build and save BookChunk entities
        const chunkEntities = subChunks.map((chunk, idx) =>
          queryRunner.manager.create(BookChunk, {
            chapterId: savedChapter.id,
            contentText: chunk.contentText,
            pageNumber: chunk.pageNumber ?? null,
            embedding: allEmbeddings[idx] ?? null,
          }),
        );

        await queryRunner.manager.save(chunkEntities);
        totalChunks += chunkEntities.length;

        console.log(
          `      ✅ Saved ${chunkEntities.length} chunks for chapter "${identified.title}"`,
        );
      }

      await queryRunner.commitTransaction();

      console.log(`\n${'═'.repeat(60)}`);
      console.log(
        `🎉 [INGEST] Complete! Chapters: ${totalChapters} | Chunks: ${totalChunks}`,
      );
      console.log(`${'═'.repeat(60)}\n`);
    } catch (dbErr: any) {
      await queryRunner.rollbackTransaction();
      console.error('❌ [INGEST] DB transaction failed:', dbErr.message);
      throw new ServiceUnavailableException(
        'Failed to save structured data to database.',
      );
    } finally {
      await queryRunner.release();
    }

    return { chaptersCreated: totalChapters, chunksCreated: totalChunks };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * STEP 1 IMPL: Call Gemini to extract chapter structure from raw OCR text.
   * Returns a parsed array of IdentifiedChapter.
   *
   * NOTE: We deliberately do NOT use responseMimeType:'application/json' here
   * because Gemini's JSON mode enforces a root-level *object*, but we need a
   * root-level *array*. We use plain text mode and extract the JSON ourselves.
   */
  private async extractChapterStructure(
    pages: PageText[],
    rawText: string,
  ): Promise<IdentifiedChapter[]> {
    const indexText = this.chapterDetection.extractIndexText(pages);
    const pageMarkedText = this.chapterDetection.formatPagesForAi(pages, 30000);
    const prompt = TOC_EXTRACTION_PROMPT.replace(
      '{INDEX_OCR_TEXT}',
      indexText.slice(0, 8000),
    ).replace('{RAW_OCR_TEXT}', pageMarkedText || rawText.slice(0, 30000));

    console.log(`   📡 Calling Gemini for TOC extraction...`);
    console.log(
      `   📝 Prompt size: index=${indexText.length} chars, body=${(pageMarkedText || rawText).slice(0, 30000).length} chars`,
    );

    let rawResponseText = '';

    if (!this.isGemini && this.openaiClient) {
      // ── OpenAI path ──────────────────────────────────────────────────────
      const completion = await this.openaiClient.chat.completions.create({
        model: this.chatModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });
      rawResponseText = completion.choices[0]?.message?.content ?? '[]';
    } else if (this.apiKey) {
      // ── Gemini path (with retry on 503/429) ──────────────────────────────
      // Plain text mode — NOT application/json — so Gemini can return a root array.
      const modelName = this.chatModel.startsWith('models/')
        ? this.chatModel
        : `models/${this.chatModel}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

      const MAX_RETRIES = 3;
      const RETRY_DELAYS = [2000, 4000, 8000]; // ms

      let lastError = '';
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(
          `   📡 Gemini attempt ${attempt}/${MAX_RETRIES}...`,
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              // No responseMimeType here — plain text so array is allowed at root
              temperature: 0.1,
            },
          }),
        });

        const data = (await response.json()) as any;
        console.log(`   🔍 Gemini HTTP status: ${response.status}`);

        // 503 / 429 = transient overload → retry after delay
        if (response.status === 503 || response.status === 429) {
          lastError = data.error?.message || `HTTP ${response.status}`;
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt - 1];
            console.warn(
              `   ⏳ Gemini overloaded (${response.status}). Retrying in ${delay / 1000}s...`,
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new Error(`Gemini still unavailable after ${MAX_RETRIES} attempts: ${lastError}`);
        }

        if (data.error) {
          console.error(`   ❌ Gemini error:`, JSON.stringify(data.error));
          throw new Error(data.error?.message || `Gemini API error`);
        }
        if (!response.ok) {
          throw new Error(`Gemini API failed with status ${response.status}`);
        }

        rawResponseText =
          data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        console.log(
          `   🤖 Gemini raw response (first 500 chars): ${rawResponseText.slice(0, 500)}`,
        );
        break; // success — exit retry loop
      }
    } else {
      throw new Error('No API key configured – cannot extract chapter structure.');
    }

    // ── Extract JSON array from the response text ─────────────────────────
    // Strip markdown fences first
    let jsonString = rawResponseText
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    // If Gemini added surrounding prose, grab just the [...] block
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonString = arrayMatch[0];
    }

    if (!jsonString) {
      throw new Error(
        `Gemini returned an empty response. Raw: "${rawResponseText.slice(0, 300)}"`,
      );
    }

    console.log(
      `   📋 Extracted JSON string (first 300 chars): ${jsonString.slice(0, 300)}`,
    );

    // ── Parse ─────────────────────────────────────────────────────────────
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr: any) {
      throw new Error(
        `JSON parse failed: ${parseErr.message}. Raw JSON: "${jsonString.slice(0, 300)}"`,
      );
    }

    // Handle Gemini wrapping array inside an object ({ "chapters": [...] })
    if (!Array.isArray(parsed)) {
      const wrapperKeys = ['chapters', 'data', 'result', 'items', 'sections'];
      for (const key of wrapperKeys) {
        if (Array.isArray(parsed[key])) {
          console.log(`   ℹ️  Gemini wrapped array in object key "${key}" – unwrapping`);
          parsed = parsed[key];
          break;
        }
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        `AI response is not a JSON array. Parsed type: ${typeof parsed}. Raw: "${jsonString.slice(0, 200)}"`,
      );
    }

    // ── Validate + normalise each entry ───────────────────────────────────
    const chapters: IdentifiedChapter[] = parsed
      .filter(
        (item: any) =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.title === 'string' &&
          item.title.trim().length > 0,
      )
      .map((item: any, idx: number) => ({
        title: String(item.title).trim(),
        unitTitle: String(item.unitTitle ?? 'Complete Book').trim(),
        chapterNumber:
          typeof item.chapterNumber === 'number' && item.chapterNumber > 0
            ? item.chapterNumber
            : idx + 1,
        approximateKeywords: Array.isArray(item.approximateKeywords)
          ? item.approximateKeywords
              .filter((k: any) => typeof k === 'string')
              .slice(0, 10)
          : [],
        startPage:
          typeof item.startPage === 'number' && item.startPage > 0
            ? item.startPage
            : undefined,
      }));

    return chapters;
  }

  /**
   * STEP 2 IMPL (AI path): Ask Gemini to slice the full text by chapter.
   * Returns a Map<chapterNumber, chapterText>.
   *
   * Only used when the full text is ≤ 28 000 chars (fits in one prompt).
   * For larger books we fall through to heuristicKeywordSlice().
   */
  private async sliceTextByChapters(
    chapters: IdentifiedChapter[],
    fullText: string,
  ): Promise<Map<number, string>> {
    // For very large texts the AI slicing prompt becomes impractical.
    // Use heuristic instead.
    if (fullText.length > 28000) {
      console.log(
        '   ℹ️  Text too large for AI slicing – using keyword heuristic',
      );
      return this.heuristicKeywordSlice(chapters, fullText);
    }

    const prompt = buildSlicingPrompt(chapters, fullText);

    let jsonString = '';

    if (!this.isGemini && this.openaiClient) {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.chatModel,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });
      jsonString = completion.choices[0]?.message?.content ?? '{}';
    } else if (this.apiKey) {
      const modelName = this.chatModel.startsWith('models/')
        ? this.chatModel
        : `models/${this.chatModel}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
          },
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        throw new Error(
          data.error?.message ||
            `Gemini slice API failed with status ${response.status}`,
        );
      }

      jsonString =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    } else {
      throw new Error('No API key – cannot slice text.');
    }

    jsonString = jsonString
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed: Record<string, string> = JSON.parse(jsonString);

    const resultMap = new Map<number, string>();
    for (const [key, text] of Object.entries(parsed)) {
      const num = parseInt(key, 10);
      if (!isNaN(num) && typeof text === 'string' && text.trim().length > 0) {
        resultMap.set(num, text.trim());
      }
    }

    // Ensure every identified chapter has at least some text
    for (const ch of chapters) {
      if (!resultMap.has(ch.chapterNumber)) {
        // Fall back: give it the full text so it is never empty
        resultMap.set(ch.chapterNumber, fullText);
      }
    }

    return resultMap;
  }

  /**
   * STEP 2 IMPL (Heuristic path):
   * Uses the approximateKeywords + title to find each chapter's start in the
   * full text and builds text slices between consecutive boundaries.
   * Zero AI calls – always succeeds even offline.
   */
  private heuristicKeywordSlice(
    chapters: IdentifiedChapter[],
    fullText: string,
  ): Map<number, string> {
    const lowerFull = fullText.toLowerCase();

    // Find the best start position for each chapter in the text
    const positions: Array<{ chapterNumber: number; pos: number }> = [];

    for (const ch of chapters) {
      const candidates: number[] = [];

      // Search by title (fuzzy – OCR tolerant)
      const titleIdx = this.chapterDetection.findTitlePosition(
        fullText,
        ch.title,
      );
      if (titleIdx !== -1) candidates.push(titleIdx);

      // Search by first keyword
      for (const kw of ch.approximateKeywords.slice(0, 3)) {
        const kwIdx = lowerFull.indexOf(kw.toLowerCase());
        if (kwIdx !== -1) candidates.push(kwIdx);
      }

      if (candidates.length > 0) {
        positions.push({
          chapterNumber: ch.chapterNumber,
          pos: Math.min(...candidates),
        });
      }
    }

    // Sort by discovered position
    positions.sort((a, b) => a.pos - b.pos);

    const resultMap = new Map<number, string>();

    if (positions.length === 0) {
      // No boundaries found – everything goes to ch.1
      for (const ch of chapters) {
        resultMap.set(ch.chapterNumber, fullText);
      }
      return resultMap;
    }

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].pos;
      const end =
        i + 1 < positions.length ? positions[i + 1].pos : fullText.length;
      resultMap.set(positions[i].chapterNumber, fullText.slice(start, end));
    }

    // Chapters not found in text → give them full text as fallback
    for (const ch of chapters) {
      if (!resultMap.has(ch.chapterNumber)) {
        resultMap.set(ch.chapterNumber, fullText);
      }
    }

    return resultMap;
  }

  // ─── Offline mock response ──────────────────────────────────────────────

  private getMockResponse(sources: any[], query: string) {
    const qLower = query.toLowerCase();
    let bestChunk = '';
    if (sources && sources.length > 0) {
      const matchingChunk = sources.find((s) => {
        const text = s.contentText.toLowerCase();
        return qLower
          .split(/\s+/)
          .some((word) => word.length > 3 && text.includes(word));
      });
      bestChunk = matchingChunk
        ? matchingChunk.contentText
        : sources[0].contentText;
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

    return { answer, sources: sources || [] };
  }
}
