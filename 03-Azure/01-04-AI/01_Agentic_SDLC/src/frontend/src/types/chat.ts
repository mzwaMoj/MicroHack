export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCitation {
  sourceId: string;
  sourceType: 'product' | 'supplier';
  title: string;
}

export interface ChatProductMatch {
  productId: number;
  supplierId: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  unit: string;
  imgName: string;
  discount?: number;
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