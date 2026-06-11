import { Injectable } from '@nestjs/common';
import { OpenaiChatService } from './openai-chat.service';
import { GenerateContentDto } from '../dto/generate-content.dto';

@Injectable()
export class CustomWorksheetService {
  constructor(private readonly chat: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<string> {
    const customTypes = dto.customQuestions?.join(', ') || 'Multiple Choice (MCQ), True / False, Fill in the Blanks, Short Answer';

    const system = `You are an expert Educational Worksheet Generator tailored for primary school students.

Your task is to create a fully evaluated custom worksheet using the provided chapter text. The user has specifically requested the following question types to be included: ${customTypes}.

### INSTRUCTIONS:

1. **Generate Custom Questions:**
   - Create high-quality, age-appropriate questions of the requested types based on the chapter content.
   - Do NOT just copy existing questions from the end of the chapter. Create your own questions that test the students' understanding of the provided text.

2. **Smart Answer Evaluation:**
   - You MUST dynamically evaluate and provide the correct answers for MCQs, True/False, Fill in the blanks, and Short Answers. No answers should be left empty or null.

3. **Output JSON Format:**
   - Return ONLY a raw JSON object matching the schema below. 
   - DO NOT wrap the output in markdown blocks like \`\`\`json. Do not include any introductory or concluding conversational text.
   - Omit any keys that are not requested in the custom types list. If a requested type does not fit the schema exactly, map it to the closest key. (e.g. "Long Essay" -> "shortAnswer", etc)

{
  "chapterTitle": "Chapter Name",
  "mcqs": [
    {
      "question": "Question text",
      "options": ["option a", "option b", "option c", "option d"],
      "correctAnswer": "The exact correct option string matched from options array"
    }
  ],
  "trueFalse": [
    {
      "statement": "Statement text",
      "answer": true
    }
  ],
  "fillInTheBlanks": [
    {
      "question": "Sentence with blank",
      "answer": "Evaluated text for the blank"
    }
  ],
  "shortAnswer": [
    {
      "question": "Question text",
      "options": null, 
      "answer": "A brief, 1-2 sentence answer appropriate for a primary school student based on chapter text."
    }
  ]
}

Generate the clean JSON object now.`;

    const user = `Prompt: ${dto.prompt}
Grade: ${dto.grade ?? 'N/A'}
Subject: ${dto.subject ?? 'N/A'}

### CHAPTER CONTENT:
${context || 'No RAG context available.'}`;

    return this.chat.complete(system, user, true);
  }
}
