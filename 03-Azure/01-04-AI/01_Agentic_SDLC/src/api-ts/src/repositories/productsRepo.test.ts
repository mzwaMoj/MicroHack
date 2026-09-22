import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsRepository } from './productsRepo';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };

    repository = new ProductsRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should search products by name, sku, and description with parameterized SQL', async () => {
      mockDb.all.mockResolvedValue([
        {
          product_id: 1,
          supplier_id: 1,
          name: 'SmartFeeder One',
          description: 'AI-powered feeder',
          price: 99.99,
          sku: 'SF-001',
          unit: 'each',
          img_name: 'smartfeeder.png',
          discount: 0,
        },
      ]);

      const result = await repository.search({ search: 'SMART' });

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(description) LIKE ?) ORDER BY product_id',
        ['%smart%', '%smart%', '%smart%'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(1);
      expect(result[0].sku).toBe('SF-001');
    });

    it('should combine supplier and price filters', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.search({ supplierId: 2, minPrice: 10, maxPrice: 25 });

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE supplier_id = ? AND price >= ? AND price <= ? ORDER BY product_id',
        [2, 10, 25],
      );
      expect(result).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should use a parameterized LIKE query', async () => {
      mockDb.all.mockResolvedValue([]);

      await repository.findByName("Smart' OR 1=1 --");

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY name',
        ["%Smart' OR 1=1 --%"],
      );
    });
  });
});