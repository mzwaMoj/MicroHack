import { Product } from './product';

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export type ChatSourceType = 'product' | 'supplier';

export interface ChatCitation {
  sourceId: string;
  sourceType: ChatSourceType;
  title: string;
}

export interface ChatProductMatch extends Product {
  supplierName: string;
  supplierActive: boolean;
  supplierVerified: boolean;
  score: number;
  sourceId: string;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
  products: ChatProductMatch[];
  interpretedImage?: string;
}

export interface GeneratedChatAnswer {
  answer: string;
  citationIds: string[];
}