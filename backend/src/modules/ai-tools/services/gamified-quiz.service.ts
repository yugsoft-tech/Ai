import { Injectable } from '@nestjs/common';
import { GenerateContentDto } from '../dto/generate-content.dto';
import { OpenaiChatService } from './openai-chat.service';

@Injectable()
export class GamifiedQuizService {
  constructor(private readonly chatService: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<any> {
    const systemPrompt = `You are a Game Master for an educational quiz app. Your task is to generate a highly interactive and engaging gamified quiz based STRICTLY on the provided chapter text/context.

You MUST generate EXACTLY 10 questions.
You MUST mix these 4 types of questions:
1. 'story_trivia' - A multiple-choice question based on a specific fact or event from the context.
2. 'word_meaning' - A multiple-choice question testing the definition or synonym of a key vocabulary word found in the context.
3. 'riddle' - A creative riddle where the answer is a concept or character from the context.
4. 'quick_task' - A fast-paced logical deduction or ordering task (e.g., "What happened first?").

Return the output in STRICT JSON format matching this schema:
{
  "quizTitle": "string",
  "questions": [
    {
      "id": "string", // Unique identifier for the question (e.g., "q1")
      "type": "string", // One of: "story_trivia", "word_meaning", "riddle", "quick_task"
      "question": "string",
      "options": ["string", "string", "string", "string"], // Exactly 4 options
      "correctAnswer": "string", // Must exactly match one of the options
      "timeLimit": 15 // Always 15
    }
  ]
}

Ensure the questions are engaging, challenging, and strictly derived from the provided context. Do NOT include Markdown formatting or \`\`\`json wrappers in the output.`;

    const userPrompt = `Context/Chapter Text:
${context}

Additional Instructions:
${dto.prompt || 'Generate a fun and challenging gamified quiz based on the context.'}
`;

    const jsonString = await this.chatService.complete(
      systemPrompt,
      userPrompt,
      true,
    );
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return { error: 'Failed to parse JSON', raw: jsonString };
    }
  }
}
