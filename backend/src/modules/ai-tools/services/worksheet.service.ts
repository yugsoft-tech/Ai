import { Injectable } from '@nestjs/common';
import { OpenaiChatService } from './openai-chat.service';
import { GenerateContentDto } from '../dto/generate-content.dto';

@Injectable()
export class WorksheetService {
  constructor(private readonly chat: OpenaiChatService) {}

  async generate(dto: GenerateContentDto, context: string): Promise<string> {
    const system = `You are an expert Educational Worksheet Generator tailored for primary school students.

Your task is to create a fully evaluated worksheet using ONLY the actual questions that appear at the END of the chapter in the textbook.

### INSTRUCTIONS:

1. **Extract Questions from Chapter End:**
   - Locate sections like: "Question Time", "Tick (✓) the right option", "Write T for true and F for false", "Answer the following questions", "Fill in the blanks", "New Words", or "Fun Words".
   - Use ONLY these exact textbook questions. Do NOT invent, modify, or rewrite the questions.

2. **Smart Answer Evaluation (CRITICAL):**
   - Even if the textbook has blank checkboxes or empty blanks, you MUST read the chapter context above and dynamically evaluate the correct answers for MCQs, True/False, Fill in the blanks, and Short Answers. No answers should be left empty or null.

3. **Output JSON Format:**
   - Return ONLY a raw JSON object matching the schema below. 
   - DO NOT wrap the output in markdown blocks like \`\`\`json. Do not include any introductory or concluding conversational text.

{
  "chapterTitle": "Chapter Name",
  "mcqs": [
    {
      "question": "Question text",
      "options": ["option a", "option b", "option c"],
      "correctAnswer": "The exact correct option string matched from options array"
    }
  ],
  "trueFalse": [
    {
      "statement": "Statement text",
      "answer": true/false
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
      "answer": "A brief, 1-sentence answer appropriate for a primary school student based on chapter text."
    }
  ],
  "vocabulary": [
    {
      "word": "word",
      "meaning": "meaning extracted from the textbook"
    }
  ]
}

### CRITICAL RULES:
- Maintain EXACT wording from the book for all questions.
- If a section (e.g., Fill in the blanks) does not exist in the chapter text, return an empty array [] for that key. Do not omit the key.
- For MCQs, ensure the "correctAnswer" strictly matches one of the values inside the "options" array.

Generate the clean JSON object now.`;

    const user = `Prompt: ${dto.prompt}
Grade: ${dto.grade ?? 'N/A'}
Subject: ${dto.subject ?? 'N/A'}

### CHAPTER CONTENT:
${context || 'No RAG context available.'}`;

    return this.chat.complete(system, user, true);
  }
}
