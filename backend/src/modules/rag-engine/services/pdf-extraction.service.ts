import { Injectable, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as pdfPoppler from 'pdf-poppler';
import * as Tesseract from 'tesseract.js';

export interface PageText {
  pageNumber: number;
  text: string;
}

@Injectable()
export class PdfExtractionService {
  private readonly logger = new Logger(PdfExtractionService.name);

  async extractText(buffer: Buffer): Promise<PageText[]> {
    if (!buffer?.length) {
      throw new BadRequestException('Empty PDF buffer');
    }

    const tempDirId = uuidv4();
    const tempDirPath = path.join(os.tmpdir(), tempDirId);
    const tempPdfPath = path.join(tempDirPath, 'document.pdf');
    const pages: PageText[] = [];

    try {
      // 1. Setup Temporary Directory
      await fs.promises.mkdir(tempDirPath, { recursive: true });
      await fs.promises.writeFile(tempPdfPath, buffer);

      // 2. Convert PDF to Images
      const popplerOpts = {
        format: 'jpeg',
        out_dir: tempDirPath,
        out_prefix: 'page',
        page: null, // all pages
      };
      
      // Inject portable poppler to PATH dynamically
      const portablePopplerPath = path.join(process.cwd(), 'poppler', 'poppler-24.08.0', 'Library', 'bin');
      if (fs.existsSync(portablePopplerPath)) {
        if (!process.env.PATH?.includes(portablePopplerPath)) {
          process.env.PATH = `${portablePopplerPath};${process.env.PATH}`;
        }
      }

      this.logger.log(`Converting PDF to images in ${tempDirPath}`);
      await pdfPoppler.convert(tempPdfPath, popplerOpts);

      // 3. Find generated images
      const files = await fs.promises.readdir(tempDirPath);
      const imageFiles = files
        .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
        // pdf-poppler generates files like page-1.jpg, page-2.jpg
        // Need to sort them correctly
        .sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });

      if (imageFiles.length === 0) {
        throw new BadRequestException('Could not extract any pages from the PDF. Ensure poppler-utils is installed.');
      }

      this.logger.log(`Found ${imageFiles.length} pages. Starting Tesseract OCR...`);

      // 4. Run Tesseract OCR sequentially to avoid memory bloat
      let pageIndex = 1;
      for (const imgFile of imageFiles) {
        const imgPath = path.join(tempDirPath, imgFile);
        this.logger.log(`Running OCR on page ${pageIndex}/${imageFiles.length}...`);
        
        const { data } = await Tesseract.recognize(imgPath, 'eng');
        
        pages.push({
          pageNumber: pageIndex,
          text: data.text.trim() || '[Blank Page]'
        });
        pageIndex++;
      }

      this.logger.log(`OCR complete. Extracted ${pages.length} pages.`);
      return pages;

    } catch (error: any) {
      this.logger.error(`OCR Extraction failed: ${error.message}`, error.stack);
      throw new ServiceUnavailableException(`OCR Extraction failed: ${error.message}`);
    } finally {
      // 5. Cleanup Temporary Files
      try {
        await fs.promises.rm(tempDirPath, { recursive: true, force: true });
        this.logger.log(`Cleaned up temporary directory: ${tempDirPath}`);
      } catch (cleanupError: any) {
        this.logger.error(`Failed to clean up temp directory ${tempDirPath}: ${cleanupError.message}`);
      }
    }
  }
}
