import {
  ChatHistoryMessage,
  ChatResponse,
  ChatCitation,
  ChatProductMatch,
} from '../models/chat';
import {
  CatalogDocument,
  CatalogKnowledge,
  loadCatalogKnowledge,
} from './catalogKnowledge';
import {
  CatalogAiClient,
  OpenAiCatalogClient,
  UploadedChatImage,
} from './openAiCatalogClient';

interface RankedDocument {
  document: CatalogDocument;
  score: number;
}

export interface CatalogChatInput {
  message?: string;
  image?: UploadedChatImage;
  history?: ChatHistoryMessage[];
}

type KnowledgeLoader = () => Promise<CatalogKnowledge>;

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class CatalogChatService {
  private cachedFingerprint: string | null = null;
  private cachedDocuments: CatalogDocument[] = [];
  private cachedEmbeddings: number[][] = [];

  constructor(
    private readonly aiClient: CatalogAiClient = new OpenAiCatalogClient(),
    private readonly knowledgeLoader: KnowledgeLoader = loadCatalogKnowledge,
  ) {}

  async chat(input: CatalogChatInput): Promise<ChatResponse> {
    const interpretedImage = input.image
      ? await this.aiClient.describeImage(input.image)
      : undefined;
    const query = [input.message?.trim(), interpretedImage]
      .filter((value): value is string => Boolean(value))
      .join('\nImage description: ');

    const rankedDocuments = await this.retrieve(query);
    const minimumScore = Number(process.env.CHAT_MIN_SCORE || '0.25');
    const relevantDocuments = rankedDocuments.filter(({ score }) => score >= minimumScore);

    if (relevantDocuments.length === 0) {
      return {
        answer: 'I could not find a confident match in the current product catalog. Try describing the product\'s purpose, features, or budget.',
        citations: [],
        products: [],
        interpretedImage,
      };
    }

    const sources = relevantDocuments.map(({ document }) => document);
    const generated = await this.aiClient.generateAnswer(query, sources, input.history ?? []);
    const sourceIds = new Set(sources.map(({ id }) => id));
    const citationIds = generated.citationIds.filter((id) => sourceIds.has(id));
    const effectiveCitationIds = citationIds.length > 0 ? citationIds : [sources[0].id];
    const citations = effectiveCitationIds
      .map((id) => sources.find((source) => source.id === id))
      .filter((source): source is CatalogDocument => Boolean(source))
      .map<ChatCitation>((source) => ({
        sourceId: source.id,
        sourceType: source.type,
        title: source.title,
      }));
    const products = relevantDocuments.flatMap<ChatProductMatch>(({ document, score }) => {
      if (document.type !== 'product' || !document.product) {
        return [];
      }
      return [{
        ...document.product,
        supplierName: document.supplier.name,
        supplierActive: document.supplier.active,
        supplierVerified: document.supplier.verified,
        score: Number(score.toFixed(4)),
        sourceId: document.id,
      }];
    }).slice(0, 4);

    return {
      answer: generated.answer,
      citations,
      products,
      interpretedImage,
    };
  }

  private async retrieve(query: string): Promise<RankedDocument[]> {
    const knowledge = await this.knowledgeLoader();
    if (knowledge.fingerprint !== this.cachedFingerprint) {
      this.cachedEmbeddings = await this.aiClient.embed(
        knowledge.documents.map(({ content }) => content),
      );
      this.cachedDocuments = knowledge.documents;
      this.cachedFingerprint = knowledge.fingerprint;
    }

    const [queryEmbedding] = await this.aiClient.embed([query]);
    const topK = Math.max(1, Math.min(8, Number(process.env.CHAT_TOP_K || '5')));

    return this.cachedDocuments
      .map((document, index) => ({
        document,
        score: cosineSimilarity(queryEmbedding, this.cachedEmbeddings[index] ?? []),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }
}