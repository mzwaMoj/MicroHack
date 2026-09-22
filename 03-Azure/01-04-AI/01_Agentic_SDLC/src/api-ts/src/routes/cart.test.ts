import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';
import cartRouter from './cart';
import orderRouter from './order';
import { generateSync } from 'otplib';

let app: express.Express;
const totpSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

describe('Cart API', () => {
  beforeEach(async () => {
    process.env.PAYMENT_SIMULATION_ENABLED = 'true';
    process.env.PAYMENT_TOTP_SECRET = totpSecret;
    process.env.PAYMENT_TOTP_ISSUER = 'OctoCAT Test';
    await closeDatabase();
    const db = await getDatabase(true);
    await runMigrations(true);
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [
      1,
      1,
      'Main Branch',
    ]);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'Smart Feeder', 'Automated feeder', 19.99, 'SF-1', 'each', 'feeder.png', 0.1],
    );

    app = express();
    app.use(express.json());
    app.use('/cart', cartRouter);
    app.use('/orders', orderRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    delete process.env.PAYMENT_SIMULATION_ENABLED;
    delete process.env.PAYMENT_TOTP_SECRET;
    delete process.env.PAYMENT_TOTP_ISSUER;
    await closeDatabase();
  });

  it('persists add, update, and remove operations with accurate totals', async () => {
    const added = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 2 });
    expect(added.status).toBe(200);
    expect(added.body.items[0]).toMatchObject({ quantity: 2, unitPrice: 17.99, lineTotal: 35.98 });
    expect(added.body.total).toBe(35.98);

    const loaded = await request(app).get('/cart/1');
    expect(loaded.body.orderId).toBe(added.body.orderId);

    const itemId = loaded.body.items[0].orderDetailId;
    const updated = await request(app).put(`/cart/1/items/${itemId}`).send({ quantity: 3 });
    expect(updated.body.total).toBe(53.97);

    expect((await request(app).delete(`/cart/1/items/${itemId}`)).status).toBe(204);
    expect((await request(app).get('/cart/1')).body.items).toEqual([]);
  });

  it('rejects invalid quantities and missing related resources consistently', async () => {
    const invalid = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 0 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const missingProduct = await request(app).post('/cart/1/items').send({ productId: 999, quantity: 1 });
    expect(missingProduct.status).toBe(404);
    expect(missingProduct.body.error.code).toBe('NOT_FOUND');

    const missingBranch = await request(app).get('/cart/999');
    expect(missingBranch.status).toBe(404);
  });

  it('does not allow an item to be changed through another branch cart', async () => {
    const db = await getDatabase();
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [
      2,
      1,
      'Second Branch',
    ]);
    const added = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 1 });
    const itemId = added.body.items[0].orderDetailId;

    const response = await request(app).put(`/cart/2/items/${itemId}`).send({ quantity: 5 });
    expect(response.status).toBe(404);
    expect((await request(app).get('/cart/1')).body.items[0].quantity).toBe(1);
  });

  it('returns Google Authenticator-compatible setup details', async () => {
    const response = await request(app).get('/cart/1/payment/setup');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      issuer: 'OctoCAT Test',
      accountName: 'branch-1',
      manualEntryKey: totpSecret,
    });
    expect(response.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects invalid authentication codes without changing the cart', async () => {
    const added = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 1 });
    const response = await request(app).post('/cart/1/checkout').send({
      cardholderName: 'Octo Cat',
      paymentMethod: 'demo-card-approved',
      otp: '000000',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect((await request(app).get('/cart/1')).body.orderId).toBe(added.body.orderId);
  });

  it('records a decline and leaves the cart intact', async () => {
    const added = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 2 });
    const response = await request(app).post('/cart/1/checkout').send({
      cardholderName: 'Octo Cat',
      paymentMethod: 'demo-card-declined',
      otp: generateSync({ secret: totpSecret }),
    });

    expect(response.status).toBe(402);
    expect(response.body.error.code).toBe('PAYMENT_DECLINED');
    expect((await request(app).get('/cart/1')).body.orderId).toBe(added.body.orderId);

    const db = await getDatabase();
    expect(await db.get<{ status: string }>('SELECT status FROM payment_attempts')).toEqual({
      status: 'declined',
    });
  });

  it('approves payment, closes the cart, and exposes the order in history', async () => {
    const added = await request(app).post('/cart/1/items').send({ productId: 1, quantity: 2 });
    const response = await request(app).post('/cart/1/checkout').send({
      cardholderName: 'Octo Cat',
      paymentMethod: 'demo-card-approved',
      otp: generateSync({ secret: totpSecret }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      orderId: added.body.orderId,
      branchId: 1,
      amount: 35.98,
      status: 'approved',
      orderStatus: 'pending',
    });
    expect((await request(app).get('/cart/1')).body).toMatchObject({ orderId: null, items: [], total: 0 });

    const history = await request(app).get('/orders/branch/1/history');
    expect(history.status).toBe(200);
    expect(history.body[0]).toMatchObject({ orderId: added.body.orderId, status: 'pending', total: 35.98 });
  });
});