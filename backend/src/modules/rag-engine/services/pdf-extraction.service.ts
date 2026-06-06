import { Injectable, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfExtractionService {
  async extractText(buffer: Buffer): Promise<string> {
    if (!buffer?.length) {
      throw new BadRequestException('Empty PDF buffer');
    }
    const result = await pdfParse(buffer);
    const text = (result.text as string)?.trim();
    if (!text) {
      throw new BadRequestException('No extractable text found in PDF');
    }
    
    // Clean and de-duplicate the text before returning
    return this.cleanExtractedText(text);
  }

  private deDuplicateSubstrings(word: string): string {
    if (/^\d+$/.test(word)) return word;

    const n = word.length;
    for (let len = 2; len <= Math.floor(n / 2); len++) {
      if (n % len === 0) {
        const pattern = word.substring(0, len);
        let isRepeating = true;
        for (let i = len; i < n; i += len) {
          if (word.substring(i, i + len) !== pattern) {
            isRepeating = false;
            break;
          }
        }
        if (isRepeating) {
          if (/[a-zA-Z]/.test(pattern)) {
            return pattern;
          }
        }
      }
    }
    return word;
  }

  private deDuplicatePhrases(str: string): string {
    let result = str;
    let prev;
    do {
      prev = result;
      result = result.replace(/(.{3,})\s*\1/gi, '$1');
    } while (result !== prev);
    return result;
  }

  private cleanExtractedText(text: string): string {
    if (!text) return '';

    const lines = text.split(/\r?\n/);
    const cleanedLines = lines.map((line) => {
      let l = line.replace(/\s+/g, ' ').trim();
      if (!l) return '';

      // De-duplicate phrases first at line level
      l = this.deDuplicatePhrases(l);

      const words = l.split(' ');
      const cleanedWords = words.map((word) => this.deDuplicateSubstrings(word));

      const dedupedWords: string[] = [];
      for (const w of cleanedWords) {
        if (
          dedupedWords.length === 0 ||
          w.toLowerCase() !== dedupedWords[dedupedWords.length - 1].toLowerCase()
        ) {
          dedupedWords.push(w);
        }
      }

      return dedupedWords.join(' ');
    });

    const resultLines: string[] = [];
    for (let line of cleanedLines) {
      line = line.trim();
      if (!line) continue;

      if (
        resultLines.length > 0 &&
        line.toLowerCase() === resultLines[resultLines.length - 1].toLowerCase()
      ) {
        continue;
      }

      line = this.deDuplicatePhrases(line);
      resultLines.push(line);
    }

    return resultLines.join('\n');
  }
}
