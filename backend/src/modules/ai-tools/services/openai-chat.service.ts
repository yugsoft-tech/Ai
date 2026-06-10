import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiChatService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly isGemini: boolean;
  private readonly openaiClient: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('openai.apiKey') ?? '';
    this.model =
      this.configService.get<string>('openai.chatModel') ?? 'gemini-2.5-flash';
    this.isGemini =
      this.apiKey.startsWith('AQ.') ||
      this.apiKey.startsWith('AIzaSy') ||
      this.model.includes('gemini');

    if (!this.isGemini && this.apiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.apiKey });
    } else {
      this.openaiClient = null;
    }
  }

  /**
   * Strip markdown code fences that Gemini sometimes wraps around JSON output.
   * e.g.  ```json\n{...}\n```  →  {...}
   */
  private stripMarkdownFences(raw: string): string {
    return raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }

  private getMockResponse(userPrompt: string, jsonMode: boolean = false): string {
    if (jsonMode) {
      return JSON.stringify({
        chapterName: "Fallback Mock Plan",
        theme: "Error/Timeout",
        ncfGoals: "N/A",
        learningObjectives: ["AI is busy, please retry."],
        periods: []
      });
    }

    const prompt = userPrompt.toLowerCase();

    if (prompt.includes('lesson plan')) {
      return `[
  {
    "time": "0-10 min",
    "title": "Introduction to AI & Core Concepts",
    "desc": "Discuss real-world AI examples (e.g., self-driving cars, recommender systems) and outline neural network basics."
  },
  {
    "time": "10-25 min",
    "title": "Understanding Neural Networks",
    "desc": "Explain neurons, layers (input, hidden, output), and the analogy of a student team passing processed messages."
  },
  {
    "time": "25-40 min",
    "title": "Interactive Activity: Analog AI",
    "desc": "Divide the class into groups to act as a simple neural network logic gate to solve a classification problem manually."
  },
  {
    "time": "40-45 min",
    "title": "Summary & Homework Assignment",
    "desc": "Recap training, weights, and bias. Assign reading on reinforcement learning."
  }
]`;
    }

    if (prompt.includes('worksheet') || prompt.includes('question')) {
      return `### Worksheet: AI Core Concepts (Offline Preview)

**Q1: What is a Neural Network?**
*Answer:* A computational model inspired by the structure of biological brains, consisting of interconnected nodes (neurons) that process data to identify patterns.

**Q2: What is the role of an activation function?**
*Answer:* It introduces non-linearity into the network, allowing it to learn complex patterns and make decisions.

**Q3: Match the following:**
- Supervised Learning <-> Uses labeled training data.
- Unsupervised Learning <-> Finds hidden patterns in unlabeled data.
- Reinforcement Learning <-> Learns through rewards and penalties.`;
    }

    return `### AI Teaching Assistant (Offline Mode)

We detected that your API Key is missing or invalid. Please configure a valid Google Gemini API Key in your backend \`.env\` file to enable live generation.

*Sample Excerpt:*
Neural networks mimic the human brain's interconnected neuron structure, allowing complex pattern recognition and deep learning capabilities. In natural language processing (NLP), models use these networks to understand context, semantics, and syntax.`;
  }

  async complete(systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string> {
    if (!this.apiKey) {
      return this.getMockResponse(userPrompt, jsonMode);
    }

    if (!this.isGemini && this.openaiClient) {
      // Use OpenAI SDK
      try {
        const response = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        });

        const rawText = response.choices[0]?.message?.content?.trim() ?? '';
        console.log('--- RAW OPENAI RESPONSE ---', rawText);
        return this.stripMarkdownFences(rawText);
      } catch (err: any) {
        console.error('OpenAI API call failed:', err?.message ?? err);
        if (jsonMode) throw err; // let caller handle it
        return this.getMockResponse(userPrompt, jsonMode);
      }
    } else {
      // Use Native Gemini REST API
      const modelName = this.model.startsWith('models/')
        ? this.model
        : `models/${this.model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              ...(jsonMode && { responseMimeType: 'application/json' }),
            },
          }),
        });

        const data = (await response.json()) as any;

        if (!response.ok || data.error) {
          const errorMsg =
            data.error?.message || JSON.stringify(data.error || data);
          throw new Error(errorMsg);
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
        console.log('--- RAW GEMINI RESPONSE ---', rawText);
        return this.stripMarkdownFences(rawText);
      } catch (err: any) {
        console.error('Gemini API call failed:', err?.message ?? err);
        if (jsonMode) throw err; // let caller handle it with a proper HTTP error
        return this.getMockResponse(userPrompt, jsonMode);
      }
    }
  }
}
