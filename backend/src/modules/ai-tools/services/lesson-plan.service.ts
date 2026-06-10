import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { OpenaiChatService } from './openai-chat.service';
import { GenerateContentDto } from '../dto/generate-content.dto';

@Injectable()
export class LessonPlanService {
  constructor(private readonly chat: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<any> {
    const system = `You are an expert instructional designer for Yugsoft Tech.
The AI must generate the lesson plan based on the content fetched from the vector database for the given chapter.

You MUST return ONLY a valid JSON object with this exact structure:
{
  "chapterName": "string",
  "theme": "string",
  "ncfGoals": "string",
  "learningObjectives": ["string"],
  "periods": [
    {
      "day": "number",
      "duration": "string (e.g., 40 min)",
      "skill": "string",
      "topic": "string",
      "introduction": "string (Detailed instructions for the teacher)",
      "exploration": "string (Main activity/teaching phase)",
      "conclusion": "string (Summary and wrap up)",
      "homework": "string"
    }
  ]
}`;
    const user = `Prompt: ${dto.prompt}
Grade: ${dto.grade ?? 'N/A'}
Subject: ${dto.subject ?? 'N/A'}
Chapter: ${dto.chapterTitle ?? 'N/A'}
Curriculum context:
${context || `No RAG content has been ingested yet for this chapter. Generate the lesson plan based on the chapter title "${dto.chapterTitle ?? 'the selected chapter'}" for Subject: ${dto.subject ?? 'N/A'}, Grade: ${dto.grade ?? 'N/A'}.`}`;

    let jsonString: string;
    try {
      jsonString = await this.chat.complete(system, user, true);
    } catch (apiErr: any) {
      const msg = apiErr?.message ?? String(apiErr);
      console.error('--- GEMINI API ERROR ---', msg);
      throw new ServiceUnavailableException(
        `AI servers are currently busy. Please try again in a few minutes. (${msg})`
      );
    }

    console.log('--- RAW GEMINI RESPONSE ---', jsonString);

    try {
      return JSON.parse(jsonString);
    } catch (parseErr: any) {
      console.error('--- PARSING ERROR ---', parseErr);
      console.error('--- UNPARSEABLE STRING ---', jsonString);
      throw new InternalServerErrorException(
        `AI returned an invalid response that could not be parsed. Raw: ${jsonString?.slice(0, 200)}`
      );
    }
  }
}
