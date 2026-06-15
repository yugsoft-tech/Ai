import { Injectable } from '@nestjs/common';
import { OpenaiChatService } from './openai-chat.service';
import { GenerateContentDto } from '../dto/generate-content.dto';

@Injectable()
export class TestPaperService {
  constructor(private readonly chat: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<string> {
    const config = dto.testPaperConfig || {};
    const generalDetails = config.generalDetails || {};
    const questionStructure = config.questionStructure || [];

    const schemaStr = questionStructure.map((q: any) => {
      let exampleItem = `{ "question": "...", "answer": "..." } // Provide appropriate schema depending on question type`;
      if (q.id === 'mcqs' || q.label.toLowerCase().includes('multiple choice')) {
        exampleItem = `{ "question": "...", "options": ["option 1", "option 2", "option 3", "option 4"], "answer": "..." }`;
      }
      return `"${q.id}": [ // Array of ${q.count} questions. Each question is worth ${q.marks} marks.
        ${exampleItem}
      ]`;
    }).join(',\n  ');

    const system = `You are an expert Educational Test Paper Generator tailored for school students.

Your task is to create a fully evaluated test paper based on the provided chapter content.
The user has specifically requested the following question structure:
${JSON.stringify(questionStructure, null, 2)}

### INSTRUCTIONS:

1. **Generate Custom Questions:**
   - Create high-quality, age-appropriate questions of the requested types based on the chapter content.
   - You MUST generate EXACTLY the requested number of questions for each type as specified in the count field.

2. **Smart Answer Evaluation:**
   - You MUST dynamically evaluate and provide the correct answers for all questions.

3. **Output JSON Format:**
   - Return ONLY a raw JSON object matching the schema below. 
   - DO NOT wrap the output in markdown blocks like \`\`\`json. Do not include any introductory or concluding conversational text.

{
  "testDetails": {
    "schoolName": "${generalDetails.schoolName || 'School Name'}",
    "className": "${generalDetails.className || 'Class'}",
    "duration": "${generalDetails.duration || 'Duration'}"
  },
  "chapterTitle": "Chapter Name",
  ${schemaStr}
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
