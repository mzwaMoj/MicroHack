import OpenAI from 'openai';
import { ChatHistoryMessage, GeneratedChatAnswer } from '../models/chat';
import { CatalogDocument } from './catalogKnowledge';
import { ServiceUnavailableError } from '../utils/errors';

export interface UploadedChatImage {
  buffer: Buffer;
  mimeType: string;
}

export interface CatalogAiClient {
  embed(texts: string[]): Promise<number[][]>;
  describeImage(image: UploadedChatImage): Promise<string>;
  generateAnswer(
    query: string,
    sources: CatalogDocument[],
    history: ChatHistoryMessage[],
  ): Promise<GeneratedChatAnswer>;
}

export class OpenAiCatalogClient implements CatalogAiClient {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableError('Catalog assistant is not configured');
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL,
      });
    }
    return this.client;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.getClient().embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: texts,
      });
      return response.data.map((item) => item.embedding);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('Catalog assistant could not reach its AI provider');
    }
  }

  async describeImage(image: UploadedChatImage): Promise<string> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe the visible product and the customer need it may address. Be factual and concise. Do not identify a brand unless it is clearly visible.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.mimeType};base64,${image.buffer.toString('base64')}`,
                detail: 'low',
              },
            },
          ],
        }],
        max_tokens: 160,
      });
      const description = response.choices[0]?.message.content?.trim();
      if (!description) {
        throw new Error('Image description was empty');
      }
      return description;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('Catalog assistant could not analyze the image');
    }
  }

  async generateAnswer(
    query: string,
    sources: CatalogDocument[],
    history: ChatHistoryMessage[],
  ): Promise<GeneratedChatAnswer> {
    const sourceText = sources.map((source) => `[${source.id}] ${source.content}`).join('\n');
    const historyText = history.map((message) => `${message.role}: ${message.content}`).join('\n');

    try {
      const response = await this.getClient().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: [
              'You are the OctoCAT catalog assistant.',
              'Answer only from the supplied catalog sources.',
              'Never invent products, prices, discounts, supplier status, or availability.',
              'If the request is ambiguous, ask one concise clarifying question.',
              'Keep the answer brief and practical.',
              'Return citationIds containing only exact source IDs that support the answer.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Recent conversation:\n${historyText || '(none)'}\n\nRequest:\n${query}\n\nCatalog sources:\n${sourceText}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'catalog_answer',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                answer: { type: 'string' },
                citationIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['answer', 'citationIds'],
            },
          },
        },
      });
      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new Error('Answer was empty');
      }
      return JSON.parse(content) as GeneratedChatAnswer;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('Catalog assistant could not generate an answer');
    }
  }
}