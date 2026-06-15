import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly isGemini: boolean;
  private readonly openaiClient: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('openai.apiKey') ?? '';
    this.model =
      this.configService.get<string>('openai.embeddingModel') ??
      'gemini-embedding-2';
    this.dimensions =
      this.configService.get<number>('rag.embeddingDimensions') ?? 768;

    this.isGemini =
      this.apiKey.startsWith('AQ.') ||
      this.apiKey.startsWith('AIzaSy') ||
      this.model.includes('embedding-004');

    if (!this.isGemini && this.apiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.apiKey });
    } else {
      this.openaiClient = null;
    }
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'API key not configured in backend .env file',
      );
    }
    if (!texts.length) return [];

    if (!this.isGemini && this.openaiClient) {
      // Use OpenAI SDK
      try {
        const response = await this.openaiClient.embeddings.create({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
        });
        return response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);
      } catch (err: any) {
        throw new ServiceUnavailableException(
          `OpenAI Embedding Error: ${err.message || err}. Please configure a valid API key in the backend .env file.`,
        );
      }
    } else {
      // Use Native Gemini REST API
      const modelName = this.model.startsWith('models/')
        ? this.model
        : `models/${this.model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:batchEmbedContents`;

      try {
        const allEmbeddings: number[][] = [];
        const BATCH_SIZE = 100; // Gemini API limit is typically 100 per request

        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
          const batchTexts = texts.slice(i, i + BATCH_SIZE);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify({
              requests: batchTexts.map((text) => ({
                model: modelName,
                content: {
                  parts: [{ text }],
                },
                outputDimensionality: this.dimensions,
              })),
            }),
          });

          const data = (await response.json()) as any;

          if (!response.ok || data.error) {
            const errorMsg =
              data.error?.message || JSON.stringify(data.error || data);
            throw new Error(errorMsg);
          }

          if (!data.embeddings || !Array.isArray(data.embeddings)) {
            throw new Error(
              'Invalid response structure from Gemini API: missing embeddings array',
            );
          }

          const batchEmbeddings = data.embeddings.map((item: any) => item.values);
          allEmbeddings.push(...batchEmbeddings);
        }

        return allEmbeddings;
      } catch (err: any) {
        throw new ServiceUnavailableException(
          `Gemini Embedding Error: ${err.message || err}. Please configure a valid Gemini API key in the backend .env file.`,
        );
      }
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([query]);
    return embedding;
  }
}
