import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';
import orderRouter from './order';

let app: express.Express;

describe('Order API', () => {
  beforeEach(async () => {
    await closeDatabase();
    const db = await getDatabase(true);
    await runMigrations(true);
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [
      1,
      1,
      'Main Branch',
    ]);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [
      2,
      1,
      'Empty Branch',
    ]);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'Smart Feeder', 'Automated feeder', 20, 'SF-1', 'each', 'feeder.png', 0],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 1, 'Cat Collar', 'GPS collar', 15, 'CC-1', 'each', 'collar.png', 0],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, '2026-09-21T10:00:00.000Z', 'Launch supplies', 'Initial order', 'delivered'],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [2, 1, '2026-09-22T10:00:00.000Z', 'Shopping Cart', 'Active cart', 'cart'],
    );
    await db.run(
      'INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, 1, 2, 20, 'Two feeders'],
    );
    await db.run(
      'INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [2, 1, 2, 3, 15, 'Three collars'],
    );

    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    app.use(errorHandler);
  });

  afterEach(closeDatabase);

  it('returns branch order history with details and totals', async () => {
    const response = await request(app).get('/orders/branch/1/history');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      orderId: 1,
      branchId: 1,
      name: 'Launch supplies',
      status: 'delivered',
      total: 85,
    });
    expect(response.body[0].details).toEqual([
      expect.objectContaining({ productName: 'Smart Feeder', quantity: 2, unitPrice: 20, lineTotal: 40 }),
      expect.objectContaining({ productName: 'Cat Collar', quantity: 3, unitPrice: 15, lineTotal: 45 }),
    ]);
  });

  it('returns an empty history for a branch with no completed orders', async () => {
    const response = await request(app).get('/orders/branch/2/history');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('rejects invalid and missing branches consistently', async () => {
    const invalid = await request(app).get('/orders/branch/not-a-number/history');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const missing = await request(app).get('/orders/branch/999/history');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});