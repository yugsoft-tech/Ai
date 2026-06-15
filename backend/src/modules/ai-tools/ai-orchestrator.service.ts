import { Injectable } from '@nestjs/common';
import { RagEngineService } from '../rag-engine/rag-engine.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { HomeworkService } from './services/homework.service';
import { LessonPlanService } from './services/lesson-plan.service';
import { PptService } from './services/ppt.service';
import { WorksheetService } from './services/worksheet.service';
import { CustomWorksheetService } from './services/custom-worksheet.service';
import { TestPaperService } from './services/test-paper.service';
import { GamifiedQuizService } from './services/gamified-quiz.service';

import { AiToolType } from './ai-tool-type';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly ragEngine: RagEngineService,
    private readonly worksheet: WorksheetService,
    private readonly customWorksheet: CustomWorksheetService,
    private readonly lessonPlan: LessonPlanService,
    private readonly ppt: PptService,
    private readonly homework: HomeworkService,
    private readonly testPaper: TestPaperService,
    private readonly gamifiedQuiz: GamifiedQuizService,
  ) {}

  async generate(
    tenantId: string,
    tool: AiToolType,
    dto: GenerateContentDto,
  ) {
    const ragResults = await this.ragEngine.semanticSearch(tenantId, {
      query: dto.prompt,
      chapterId: dto.chapterId,
      chapterIds: dto.chapterIds,
      bookId: dto.bookId,
      topK: 10, // Increase topK slightly to get more context if multiple chapters
    });
    const context = ragResults
      .map((r, i) => `[${i + 1}] (sim=${r.similarity ? Number(r.similarity).toFixed(2) : '0.00'})\n${r.contentText}`)
      .join('\n\n');

    let content: any;
    switch (tool) {
      case 'worksheet':
        content = await this.worksheet.generate(dto, context);
        break;
      case 'custom-worksheet':
        content = await this.customWorksheet.generate(dto, context);
        break;
      case 'lesson-plan':
        content = await this.lessonPlan.generate(dto, context);
        break;
      case 'ppt':
        content = await this.ppt.generate(dto, context);
        break;
      case 'homework':
        content = await this.homework.generate(dto, context);
        break;
      case 'test-paper':
        content = await this.testPaper.generate(dto, context);
        break;
      case 'gamified-quiz':
        content = await this.gamifiedQuiz.generate(dto, context);
        break;
      default:
        content = '';
    }

    const result = {
      tool,
      content,
      sources: ragResults,
    };
    console.log('--- ORCHESTRATOR RESULT ---', JSON.stringify(result).slice(0, 500));
    return result;
  }
}
