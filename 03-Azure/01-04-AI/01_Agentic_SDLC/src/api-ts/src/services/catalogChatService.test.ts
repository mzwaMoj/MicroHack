import { afterEach, describe, expect, it, vi } from 'vitest';
import { Supplier } from '../models/supplier';
import { CatalogKnowledge } from './catalogKnowledge';
import { CatalogChatService } from './catalogChatService';
import { CatalogAiClient } from './openAiCatalogClient';

const supplier: Supplier = {
  supplierId: 1,
  name: 'PurrTech Innovations',
  description: 'Smart cat technology supplier',
  contactPerson: 'Felix Whiskerton',
  email: 'felix@purrtech.co',
  phone: '555-0100',
  active: true,
  verified: true,
};

const knowledge: CatalogKnowledge = {
  fingerprint: 'catalog-v1',
  documents: [
    {
      id: 'product-10',
      type: 'product',
      title: 'MemoryFoam Recovery Pod',
      content: 'Therapeutic recovery pod for senior cats and post-surgery recovery.',
      supplier,
      product: {
        productId: 10,
        supplierId: 1,
        name: 'MemoryFoam Recovery Pod',
        description: 'Therapeutic recovery pod for senior cats.',
        price: 179.99,
        sku: 'CAT-POD-001',
        unit: 'piece',
        imgName: 'recovery-pod.png',
        discount: 0,
      },
    },
    {
      id: 'supplier-1',
      type: 'supplier',
      title: supplier.name,
      content: 'PurrTech Innovations is active and verified.',
      supplier,
    },
  ],
};

function createAiClient(): CatalogAiClient {
  return {
    embed: vi.fn(async (texts: string[]) => texts.map((text) => {
      if (/unrelated|spaceship/i.test(text)) {
        return [0, 0, 1];
      }
      if (/supplier|verified|PurrTech/i.test(text)) {
        return [0, 1, 0];
      }
      return [1, 0, 0];
    })),
    describeImage: vi.fn(async () => 'A cushioned recovery bed for a cat after surgery.'),
    generateAnswer: vi.fn(async (_query, sources) => ({
      answer: 'The MemoryFoam Recovery Pod is designed for post-surgery recovery.',
      citationIds: [sources[0].id, 'invented-source'],
    })),
  };
}

describe('CatalogChatService', () => {
  afterEach(() => {
    delete process.env.CHAT_MIN_SCORE;
  });

  it('returns grounded product matches and filters invented citations', async () => {
    const service = new CatalogChatService(createAiClient(), async () => knowledge);

    const response = await service.chat({ message: 'What helps a cat after surgery?' });

    expect(response.answer).toContain('MemoryFoam Recovery Pod');
    expect(response.products).toHaveLength(1);
    expect(response.products[0]).toMatchObject({
      productId: 10,
      supplierName: 'PurrTech Innovations',
      supplierVerified: true,
      sourceId: 'product-10',
    });
    expect(response.citations).toEqual([
      { sourceId: 'product-10', sourceType: 'product', title: 'MemoryFoam Recovery Pod' },
    ]);
  });

  it('turns an uploaded image into retrieval intent', async () => {
    const aiClient = createAiClient();
    const service = new CatalogChatService(aiClient, async () => knowledge);

    const response = await service.chat({
      image: { buffer: Buffer.from('image'), mimeType: 'image/png' },
    });

    expect(aiClient.describeImage).toHaveBeenCalledOnce();
    expect(response.interpretedImage).toContain('recovery bed');
    expect(response.products[0].productId).toBe(10);
  });

  it('declines when retrieval is below the configured confidence threshold', async () => {
    process.env.CHAT_MIN_SCORE = '0.5';
    const service = new CatalogChatService(createAiClient(), async () => knowledge);

    const response = await service.chat({ message: 'I need a spaceship.' });

    expect(response.products).toEqual([]);
    expect(response.citations).toEqual([]);
    expect(response.answer).toContain('could not find a confident match');
  });
});