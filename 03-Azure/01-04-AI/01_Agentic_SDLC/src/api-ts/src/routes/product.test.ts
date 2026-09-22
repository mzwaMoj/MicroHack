import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Product API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Octo Gadgets']);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [2, 'Cat Logistics']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'SmartFeeder One', 'AI-powered feeder for nap cycles', 99.99, 'SF-001', 'each', 'smartfeeder.png', 0],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 2, 'Tracking Collar', 'GPS collar for outdoor cats', 45.5, 'TC-200', 'each', 'collar.png', 0],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [3, 1, 'Nap Pod', 'Quiet pod for warehouse cats', 150, 'NP-900', 'each', 'nappod.png', 0.1],
    );

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should return products matching a case-insensitive text search', async () => {
    const response = await request(app).get('/products?search=smartfeeder');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('SmartFeeder One');
  });

  it('should search by SKU', async () => {
    const response = await request(app).get('/products?search=tc-200');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].sku).toBe('TC-200');
  });

  it('should combine supplier and price filters', async () => {
    const response = await request(app).get('/products?supplierId=1&minPrice=100&maxPrice=200');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Nap Pod');
  });

  it('should return an empty array when no products match', async () => {
    const response = await request(app).get('/products?search=space%20tuna');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should reject invalid filter parameters', async () => {
    const response = await request(app).get('/products?minPrice=200&maxPrice=100');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('minPrice cannot be greater than maxPrice');
  });
});