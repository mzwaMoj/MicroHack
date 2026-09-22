import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ChatResponse } from '../models/chat';
import { errorHandler } from '../utils/errors';
import { createChatRouter } from './chat';

const responseBody: ChatResponse = {
  answer: 'SmartFeeder One helps monitor eating habits.',
  citations: [{ sourceId: 'product-1', sourceType: 'product', title: 'SmartFeeder One' }],
  products: [],
};

function createApp() {
  const service = {
    chat: vi.fn(async (_input: {
      message?: string;
      image?: { buffer: Buffer; mimeType: string };
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) => responseBody),
  };
  const app = express();
  app.use(express.json());
  app.use('/chat', createChatRouter(service, false));
  app.use(errorHandler);
  return { app, service };
}

describe('Chat API', () => {
  it('accepts a text-only request and bounded history', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .post('/chat')
      .field('message', 'What helps with overeating?')
      .field('history', JSON.stringify([{ role: 'user', content: 'I need a feeder.' }]));

    expect(response.status).toBe(200);
    expect(response.body.answer).toContain('SmartFeeder One');
    expect(service.chat).toHaveBeenCalledWith({
      message: 'What helps with overeating?',
      image: undefined,
      history: [{ role: 'user', content: 'I need a feeder.' }],
    });
  });

  it('accepts one supported image in memory', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .post('/chat')
      .attach('image', Buffer.from('fake png'), { filename: 'product.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(service.chat).toHaveBeenCalledOnce();
    const image = service.chat.mock.calls[0]?.[0].image;
    expect(image).toMatchObject({ mimeType: 'image/png' });
    expect(image?.buffer).toBeInstanceOf(Buffer);
  });

  it('rejects requests without text or an image', async () => {
    const { app } = createApp();
    const response = await request(app).post('/chat').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unsupported image types', async () => {
    const { app } = createApp();
    const response = await request(app)
      .post('/chat')
      .attach('image', Buffer.from('plain text'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('JPEG, PNG, or WebP');
  });

  it('rejects histories longer than six messages', async () => {
    const { app } = createApp();
    const history = Array.from({ length: 7 }, () => ({ role: 'user', content: 'hello' }));
    const response = await request(app)
      .post('/chat')
      .field('message', 'Find a feeder')
      .field('history', JSON.stringify(history));

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('at most six messages');
  });
});