import axios from 'axios';
import { api } from './config';
import type { ChatHistoryMessage, ChatResponse } from '../types/chat';

export interface SendChatRequest {
  message: string;
  image?: File;
  history: ChatHistoryMessage[];
  signal: AbortSignal;
}

export async function sendChat(request: SendChatRequest): Promise<ChatResponse> {
  const body = new FormData();
  if (request.message.trim()) {
    body.append('message', request.message.trim());
  }
  if (request.image) {
    body.append('image', request.image);
  }
  if (request.history.length > 0) {
    body.append('history', JSON.stringify(request.history.slice(-6)));
  }

  const { data } = await axios.post<ChatResponse>(
    `${api.baseURL}${api.endpoints.chat}`,
    body,
    { signal: request.signal },
  );
  return data;
}

export function getChatErrorMessage(error: unknown): string {
  if (axios.isCancel(error)) {
    return 'Request cancelled.';
  }
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'The assistant is receiving too many requests. Wait a moment and try again.';
    }
    if (error.response?.status === 503) {
      return 'The assistant is temporarily unavailable. Check the API configuration and try again.';
    }
    return error.response?.data?.error?.message ?? 'The assistant could not complete this request.';
  }
  return 'The assistant could not complete this request.';
}