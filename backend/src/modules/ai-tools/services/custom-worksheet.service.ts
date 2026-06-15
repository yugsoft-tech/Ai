import { Injectable } from '@nestjs/common';
import { OpenaiChatService } from './openai-chat.service';
import { GenerateContentDto } from '../dto/generate-content.dto';

@Injectable()
export class CustomWorksheetService {
  constructor(private readonly chat: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<string> {
    const customTypes = dto.customQuestions?.join(', ') || 'Multiple Choice (MCQ), True / False, Fill in the Blanks, Short Answer';

    const system = `You are an expert Custom Educational Worksheet Generator for primary school students.
Based on the provided chapter text, you must generate a custom test paper following the user's explicit distribution structure: ${customTypes}.

### SYSTEM CRITICAL DATA LAYOUT RULES:
1. If the user requests 'Multiple Choice (MCQ)', each MCQ item MUST contain a 'question', a strict array of exactly 3-4 strings inside the 'options' field, and the matched answer in 'correctAnswer'. Do not omit the choices.
2. If options are missing, the UI layout breaks. You must create realistic choices based on the textbook context.

### OUTPUT EXPECTED SCHEMA (STRICT RAW JSON):
{
  "chapterTitle": "Chapter Name",
  "mcqs": [
    {
      "question": "What is Neeraj's father's profession?",
      "options": ["Doctor", "Teacher", "Engineer"],
      "correctAnswer": "Teacher"
    }
  ],
  "fillInTheBlanks": [
    {
      "question": "Neeraj is _______ years old.",
      "answer": "six"
    }
  ],
  "trueFalse": [
    {
      "statement": "Seema is older than Neeraj.",
      "answer": false
    }
  ],
  "shortAnswer": [
    {
      "question": "What games do Arun and Vivek play together?",
      "answer": "They play cricket in the evening."
    }
  ]
}

Ensure you ONLY return the raw JSON object. Do not wrap it in markdown code blocks like \`\`\`json.`;

    const user = `Prompt: ${dto.prompt}
Grade: ${dto.grade ?? 'N/A'}
Subject: ${dto.subject ?? 'N/A'}

### CHAPTER CONTENT:
${context || 'No RAG context available.'}`;

    return this.chat.complete(system, user, true);
  }
}
