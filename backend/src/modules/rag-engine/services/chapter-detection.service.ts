import { Injectable } from '@nestjs/common';
import { PageText } from './pdf-extraction.service';

export interface DetectedChapter {
  title: string;
  unitTitle: string;
  chapterNumber: number;
  approximateKeywords: string[];
  startPage?: number;
}

/** Lines / phrases that are NOT story or poem titles */
const SKIP_TITLE_PATTERNS = [
  /^contents?$/i,
  /^index$/i,
  /^foreword$/i,
  /^preface$/i,
  /^note to the teacher$/i,
  /^note for the teacher$/i,
  /^acknowledgements?$/i,
  /^worksheet$/i,
  /^activity$/i,
  /^let us (read|sing|speak|write|do|play|think|learn|recite)/i,
  /^unit[\s-]*\d+/i,
  /^test paper$/i,
  /^revision$/i,
  /^cover page$/i,
  /^\[blank page\]$/i,
  /^english reader/i,
  /^ncert$/i,
  /^class\s/i,
  /^page\s+\d+$/i,
];

const LESSON_START_PATTERN =
  /\blet\s+u[s5]?\s+(?:read|sing|speak|recite|write|r[e3][a4]d|s[i1][ngn])/i;

const UNIT_LINE_PATTERN = /^\s*(Unit[\s-]*\d+[^\n]*)/i;

/** TOC line: "My Family .............. 5" or "My Family 5" (OCR-tolerant) */
const TOC_ENTRY_PATTERN =
  /^([A-Za-z][A-Za-z\s'&,().-]{2,55}?)\s+(?:[.\u00B7\u2022·\s-_]{2,}\s*)?(\d{1,3})\s*$/;

@Injectable()
export class ChapterDetectionService {
  /**
   * Best-effort chapter detection without AI.
   * Runs every strategy and returns whichever finds the most chapters.
   */
  detectChapters(pages: PageText[], _fullText: string): DetectedChapter[] {
    const strategies: DetectedChapter[][] = [
      this.detectFromIndexPages(pages),
      this.detectFromContentSection(pages),
      this.detectFromLessonMarkers(pages),
      this.detectFromPageHeaders(pages),
      this.detectStoriesBetweenUnits(pages),
    ];

    const merged = this.deduplicateChapters(strategies.flat());
    return merged.sort(
      (a, b) =>
        (a.startPage ?? 9999) - (b.startPage ?? 9999) ||
        a.chapterNumber - b.chapterNumber,
    );
  }

  /**
   * TOC lists printed book page numbers; PDF page indices are often offset.
   * Calibrate by matching the first chapter title to its actual PDF page.
   */
  calibratePageNumbers<T extends { title: string; startPage?: number }>(
    chapters: T[],
    pages: PageText[],
  ): T[] {
    const withPages = chapters.filter((c) => c.startPage != null);
    if (withPages.length === 0) return chapters;

    for (const ch of withPages) {
      for (const page of pages) {
        if (!this.pageContainsTitle(page.text, ch.title)) continue;

        const offset = page.pageNumber - ch.startPage!;
        if (Math.abs(offset) > 40) continue;

        return chapters.map((c) =>
          c.startPage != null
            ? { ...c, startPage: Math.max(1, c.startPage + offset) }
            : c,
        );
      }
    }

    return chapters;
  }

  /** How many distinct lessons the text likely contains (for validating AI output). */
  estimateExpectedChapterCount(pages: PageText[], fullText: string): number {
    const fromDetection = this.detectChapters(pages, fullText).length;
    const letUsCount = (
      fullText.match(LESSON_START_PATTERN) ?? []
    ).length;
    const unitCount = this.countUnitMarkers(fullText);

    // Each unit typically has 2–4 stories; "Let us read/sing" ≈ one per lesson
    const fromUnits = unitCount >= 2 ? unitCount * 2 : 0;
    const fromLetUs = letUsCount >= 3 ? letUsCount : 0;

    return Math.max(fromDetection, fromUnits, fromLetUs);
  }

  /** Format OCR pages with markers so AI can see page boundaries. */
  formatPagesForAi(pages: PageText[], maxChars = 30000): string {
    let result = '';
    for (const page of pages) {
      const block = `\n--- PAGE ${page.pageNumber} ---\n${page.text.trim()}\n`;
      if (result.length + block.length > maxChars) break;
      result += block;
    }
    return result.trim();
  }

  /** Extract likely index/TOC pages for a focused AI prompt. */
  extractIndexText(pages: PageText[], maxPages = 12): string {
    const indexPages = pages.slice(0, maxPages);
    return indexPages
      .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text.trim()}`)
      .join('\n\n');
  }

  /** Slice chapter text using detected start pages (1-based PDF page numbers). */
  sliceByPageRanges(
    chapters: DetectedChapter[],
    pages: PageText[],
  ): Map<number, string> {
    const sorted = [...chapters]
      .filter((c) => c.startPage != null && c.startPage > 0)
      .sort((a, b) => (a.startPage ?? 0) - (b.startPage ?? 0));

    const resultMap = new Map<number, string>();
    if (sorted.length === 0) return resultMap;

    const maxPage = pages.length;

    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i].startPage!;
      const end =
        i + 1 < sorted.length
          ? Math.max(sorted[i + 1].startPage! - 1, start)
          : maxPage;

      const text = pages
        .filter((p) => p.pageNumber >= start && p.pageNumber <= end)
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join('\n\n');

      if (text.length > 50) {
        resultMap.set(sorted[i].chapterNumber, text);
      }
    }

    return resultMap;
  }

  /** Fuzzy keyword/title search tolerant of OCR errors. */
  findTitlePosition(fullText: string, title: string): number {
    const lowerFull = fullText.toLowerCase();
    const lowerTitle = title.toLowerCase().trim();

    const exact = lowerFull.indexOf(lowerTitle);
    if (exact !== -1) return exact;

    // Try first 3 significant words
    const words = lowerTitle.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      const partial = words.slice(0, 3).join(' ');
      const partialIdx = lowerFull.indexOf(partial);
      if (partialIdx !== -1) return partialIdx;
    }

    return -1;
  }

  countUnitMarkers(fullText: string): number {
    const matches = fullText.match(/\bUnit[\s-]*\d+\b/gi);
    return matches ? new Set(matches.map((m) => m.toLowerCase())).size : 0;
  }

  /** Fill missing startPage on AI chapters using heuristic matches. */
  enrichWithStartPages<
    T extends {
      title: string;
      chapterNumber: number;
      startPage?: number;
    },
  >(chapters: T[], pages: PageText[]): T[] {
    const heuristic = this.detectFromIndexPages(pages);
    if (heuristic.length === 0) return chapters;

    return chapters.map((ch) => {
      if (ch.startPage != null) return ch;

      const match = heuristic.find(
        (h) =>
          h.title.toLowerCase() === ch.title.toLowerCase() ||
          h.title.toLowerCase().includes(ch.title.toLowerCase()) ||
          ch.title.toLowerCase().includes(h.title.toLowerCase()),
      );

      return match?.startPage ? { ...ch, startPage: match.startPage } : ch;
    });
  }

  // ─── Private detectors ────────────────────────────────────────────────────

  /** Parse TOC from pages that contain "Contents" / "Index", plus first 15 pages. */
  private detectFromContentSection(pages: PageText[]): DetectedChapter[] {
    const contentPageNums = new Set<number>();

    for (const page of pages.slice(0, 20)) {
      if (/\b(contents|index|table of contents)\b/i.test(page.text)) {
        contentPageNums.add(page.pageNumber);
        // Also grab the next page (TOC often spans 2 pages)
        contentPageNums.add(page.pageNumber + 1);
      }
    }

    // Always include first 15 pages as fallback
    for (let i = 1; i <= Math.min(15, pages.length); i++) {
      contentPageNums.add(i);
    }

    const indexPages = pages.filter((p) => contentPageNums.has(p.pageNumber));
    return this.parseTocLines(indexPages);
  }

  private detectFromIndexPages(pages: PageText[]): DetectedChapter[] {
    return this.parseTocLines(pages.slice(0, 15));
  }

  /**
   * Detect chapters by finding "Let us read/sing" lesson markers.
   * Each marker typically starts a new story/poem in NCERT textbooks.
   */
  private detectFromLessonMarkers(pages: PageText[]): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];
    let currentUnit = 'Complete Book';

    for (const page of pages) {
      if (page.pageNumber < 4) continue;

      const unitMatch = page.text.match(/\b(Unit[\s-]*\d+[^\n]*)/i);
      if (unitMatch) {
        currentUnit = unitMatch[1].trim();
      }

      const lines = page.text
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const lessonLineIdx = lines.findIndex((l) => LESSON_START_PATTERN.test(l));
      // Lesson marker must be near the top of the page (start of a new story)
      if (lessonLineIdx === -1 || lessonLineIdx > 8) continue;

      // Title is usually 1–4 lines above "Let us read/sing"
      let title: string | null = null;
      for (let i = lessonLineIdx - 1; i >= Math.max(0, lessonLineIdx - 5); i--) {
        const candidate = lines[i];
        if (this.isValidChapterTitle(candidate) && candidate.length <= 60) {
          title = this.cleanTitle(candidate);
          break;
        }
      }

      // Or title is the first short line on the page
      if (!title) {
        title = this.extractTitleFromPageHeader(lines.slice(0, lessonLineIdx + 1));
      }

      if (!title) continue;

      const last = chapters[chapters.length - 1];
      if (last && last.title.toLowerCase() === title.toLowerCase()) continue;

      chapters.push({
        title,
        unitTitle: currentUnit,
        chapterNumber: chapters.length + 1,
        approximateKeywords: this.extractKeywords(title),
        startPage: page.pageNumber,
      });
    }

    return this.deduplicateChapters(chapters);
  }

  private parseTocLines(pages: PageText[]): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];
    let currentUnit = 'Complete Book';

    for (const page of pages) {
      const lines = page.text.split(/\n/).map((l) => l.trim());

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const unitMatch = line.match(UNIT_LINE_PATTERN);
        if (unitMatch) {
          currentUnit = unitMatch[1].trim();
          continue;
        }

        // Standard TOC: "My Family ..... 5"
        const tocMatch = line.match(TOC_ENTRY_PATTERN);
        if (tocMatch) {
          const title = this.cleanTitle(tocMatch[1]);
          const startPage = parseInt(tocMatch[2], 10);
          if (this.isValidTocEntry(title, startPage)) {
            chapters.push(this.makeChapter(title, currentUnit, startPage));
          }
          continue;
        }

        // OCR split across lines: "My Family" then "5" or "... 5"
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const pageOnlyMatch = nextLine.match(/^(\.{2,}|\s)*(\d{1,3})\s*$/);
          if (
            pageOnlyMatch &&
            this.isValidChapterTitle(line) &&
            !/^unit[\s-]*\d+/i.test(line)
          ) {
            const startPage = parseInt(pageOnlyMatch[2], 10);
            if (startPage > 0 && startPage <= 500) {
              chapters.push(this.makeChapter(this.cleanTitle(line), currentUnit, startPage));
              i++;
            }
          }
        }
      }
    }

    return this.deduplicateChapters(chapters);
  }

  private makeChapter(
    title: string,
    unitTitle: string,
    startPage: number,
  ): DetectedChapter {
    return {
      title,
      unitTitle,
      chapterNumber: 0,
      approximateKeywords: this.extractKeywords(title),
      startPage,
    };
  }

  private isValidTocEntry(title: string, startPage: number): boolean {
    if (!this.isValidChapterTitle(title) || startPage <= 0 || startPage > 500) {
      return false;
    }
    if (/^unit[\s-]*\d+/i.test(title)) return false;
    return true;
  }

  private detectFromPageHeaders(pages: PageText[]): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];
    let currentUnit = 'Complete Book';
    let chapterNum = 0;

    for (const page of pages) {
      const lines = page.text
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines.slice(0, 6)) {
        const unitMatch = line.match(UNIT_LINE_PATTERN);
        if (unitMatch) {
          currentUnit = unitMatch[1].trim();
          break;
        }
      }

      const title = this.extractTitleFromPageHeader(lines);
      if (!title) continue;

      // Avoid duplicate consecutive pages with same title
      const last = chapters[chapters.length - 1];
      if (last && last.title.toLowerCase() === title.toLowerCase()) continue;

      chapterNum++;
      chapters.push({
        title,
        unitTitle: currentUnit,
        chapterNumber: chapterNum,
        approximateKeywords: this.extractKeywords(title),
        startPage: page.pageNumber,
      });
    }

    return this.deduplicateChapters(chapters);
  }

  /**
   * Find story/poem sections that appear after Unit-X markers in the body text.
   */
  private detectStoriesBetweenUnits(pages: PageText[]): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];
    let currentUnit = 'Complete Book';
    let chapterNum = 0;

    for (const page of pages) {
      const text = page.text;
      const unitMatch = text.match(/\b(Unit[\s-]*\d+[^\n]*)/i);
      if (unitMatch) {
        currentUnit = unitMatch[1].trim();
      }

      const lines = text
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const title = this.extractTitleFromPageHeader(lines);
      if (!title) continue;

      const last = chapters[chapters.length - 1];
      if (last && last.title.toLowerCase() === title.toLowerCase()) continue;

      chapterNum++;
      chapters.push({
        title,
        unitTitle: currentUnit,
        chapterNumber: chapterNum,
        approximateKeywords: this.extractKeywords(title),
        startPage: page.pageNumber,
      });
    }

    return this.deduplicateChapters(chapters);
  }

  private extractTitleFromPageHeader(lines: string[]): string | null {
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (line.length < 3 || line.length > 60) continue;
      if (!this.isValidChapterTitle(line)) continue;

      const context = lines.slice(i + 1, i + 12).join(' ');

      // Strong signal: "Let us read/sing" marker nearby → definitely a chapter start
      const hasLessonMarker =
        /let us (read|sing|speak|write|do|recite|think)/i.test(context);
      if (hasLessonMarker) {
        return this.cleanTitle(line);
      }

      // Weaker signal: looks like a title (1–6 words, starts with capital)
      // Only accept if it ALSO has a clean alpha ratio (rules out OCR noise)
      const wordCount = line.split(/\s+/).length;
      const alphaChars = (line.match(/[a-zA-Z]/g) ?? []).length;
      const alphaRatio = alphaChars / line.length;

      const looksLikeCleanTitle =
        wordCount >= 1 &&
        wordCount <= 6 &&
        /^[A-Z"'(]/.test(line) &&
        alphaRatio >= 0.70 && // at least 70% real letters
        (i === 0 || lines[i - 1].length < 40);

      // Must also be near story-content ("Read and enjoy", question words, etc.)
      const hasStoryContext =
        /read and enjoy|question time|let's (read|write|speak)|dear \w+/i.test(
          context,
        );

      if (looksLikeCleanTitle && hasStoryContext) {
        return this.cleanTitle(line);
      }
    }
    return null;
  }

  private isValidChapterTitle(title: string): boolean {
    if (!title || title.length < 3 || title.length > 65) return false;
    if (/^\d+$/.test(title)) return false;
    if (/^page\s+\d+$/i.test(title)) return false;
    if (!title.includes(' ') && title.length < 4) return false;

    // ── Reject OCR noise ─────────────────────────────────────────────────
    // Pipe, slash, backslash = typical OCR artifact ("L | GY", "Hillam Arun. Te T")
    if (/[|\\]/.test(title)) return false;

    // Too many non-alphabetic characters (>35% of the string)
    const alphaChars = (title.match(/[a-zA-Z]/g) ?? []).length;
    const alphaRatio = alphaChars / title.length;
    if (alphaRatio < 0.55) return false;

    // Reject if more than 2 single-letter tokens (e.g. "L | GY Sama ge we ai")
    const singleLetterTokens = title.split(/\s+/).filter((w) => w.length === 1);
    if (singleLetterTokens.length > 2) return false;

    // Reject ALL-CAPS-like noise (more than 60% uppercase letters)
    const upperChars = (title.match(/[A-Z]/g) ?? []).length;
    if (alphaChars > 4 && upperChars / alphaChars > 0.6) return false;

    return !SKIP_TITLE_PATTERNS.some((p) => p.test(title.trim()));
  }

  private pageContainsTitle(pageText: string, title: string): boolean {
    const lower = pageText.toLowerCase();
    const t = title.toLowerCase();
    if (lower.includes(t)) return true;
    const words = t.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      return lower.includes(words.slice(0, 2).join(' '));
    }
    return false;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/^[\d.)\s]+/, '')
      .trim();
  }

  private extractKeywords(title: string): string[] {
    return title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5);
  }

  private deduplicateChapters(chapters: DetectedChapter[]): DetectedChapter[] {
    const byTitle = new Map<string, DetectedChapter>();

    for (const ch of chapters) {
      const key = ch.title.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = byTitle.get(key);
      // Prefer entry that has a startPage
      if (!existing || (ch.startPage != null && existing.startPage == null)) {
        byTitle.set(key, ch);
      }
    }

    return [...byTitle.values()].map((ch, idx) => ({
      ...ch,
      chapterNumber: idx + 1,
    }));
  }
}
