/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Grounded product and supplier catalog assistant
 *
 * /api/chat:
 *   post:
 *     summary: Find catalog products using text, an image, or both
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               history:
 *                 type: string
 *                 description: JSON array containing up to six recent user/assistant messages
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Grounded catalog answer and matching products
 *       400:
 *         description: Invalid text, history, or image
 *       429:
 *         description: Too many assistant requests
 *       503:
 *         description: Assistant is not configured or its provider is unavailable
 */

import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { ChatHistoryMessage, ChatResponse } from '../models/chat';
import { CatalogChatService } from '../services/catalogChatService';
import { ValidationError } from '../utils/errors';

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!acceptedImageTypes.has(file.mimetype)) {
      callback(new ValidationError('image must be a JPEG, PNG, or WebP file'));
      return;
    }
    callback(null, true);
  },
});

const chatRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many assistant requests. Please wait a moment and try again.',
    },
  },
});

interface ChatService {
  chat(input: {
    message?: string;
    image?: { buffer: Buffer; mimeType: string };
    history?: ChatHistoryMessage[];
  }): Promise<ChatResponse>;
}

function parseHistory(value: unknown): ChatHistoryMessage[] {
  if (value === undefined || value === '') {
    return [];
  }

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new ValidationError('history must be valid JSON');
    }
  }

  if (!Array.isArray(parsed) || parsed.length > 6) {
    throw new ValidationError('history must contain at most six messages');
  }

  return parsed.map((message) => {
    if (!message || typeof message !== 'object') {
      throw new ValidationError('history messages must be objects');
    }
    const { role, content } = message as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') {
      throw new ValidationError('history roles must be user or assistant');
    }
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 1000) {
      throw new ValidationError('history message content must contain 1 to 1000 characters');
    }
    return { role, content: content.trim() };
  });
}

function runUpload(request: Request, response: Response, next: NextFunction): void {
  upload.single('image')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'image must be 5 MB or smaller'
        : 'only one image may be uploaded in the image field';
      next(new ValidationError(message));
      return;
    }
    next(error);
  });
}

export function createChatRouter(
  service: ChatService = new CatalogChatService(),
  enableRateLimit: boolean = true,
): express.Router {
  const router = express.Router();
  if (enableRateLimit) {
    router.use(chatRateLimiter);
  }

  router.post('/', runUpload, async (request, response, next) => {
    try {
      const rawMessage = request.body?.message;
      if (rawMessage !== undefined && typeof rawMessage !== 'string') {
        throw new ValidationError('message must be text');
      }
      const message = rawMessage?.trim();
      if (message && message.length > 2000) {
        throw new ValidationError('message must contain at most 2000 characters');
      }
      if (!message && !request.file) {
        throw new ValidationError('provide a message, an image, or both');
      }

      const result = await service.chat({
        message,
        image: request.file
          ? { buffer: request.file.buffer, mimeType: request.file.mimetype }
          : undefined,
        history: parseHistory(request.body?.history),
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createChatRouter();