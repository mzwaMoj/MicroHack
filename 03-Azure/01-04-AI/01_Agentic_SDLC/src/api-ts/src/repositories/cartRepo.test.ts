import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { CartRepository } from './cartRepo';

let repository: CartRepository;

describe('CartRepository', () => {
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
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'Smart Feeder', 'Automated feeder', 100, 'SF-1', 'each', 'feeder.png', 0.15],
    );
    repository = new CartRepository(db);
  });

  afterEach(closeDatabase);

  it('returns an empty cart until the first item is added', async () => {
    expect(await repository.findByBranchId(1)).toEqual({
      orderId: null,
      branchId: 1,
      items: [],
      total: 0,
    });
  });

  it('creates one cart, snapshots discounted pricing, and increments an existing line', async () => {
    const firstCart = await repository.addItem(1, { productId: 1, quantity: 2 });
    const updatedCart = await repository.addItem(1, { productId: 1, quantity: 1 });

    expect(firstCart.items[0]).toMatchObject({ quantity: 2, unitPrice: 85, lineTotal: 170 });
    expect(updatedCart.orderId).toBe(firstCart.orderId);
    expect(updatedCart.items).toHaveLength(1);
    expect(updatedCart.items[0]).toMatchObject({ quantity: 3, unitPrice: 85, lineTotal: 255 });
    expect(updatedCart.total).toBe(255);
  });

  it('updates and removes only items in the branch cart', async () => {
    const cart = await repository.addItem(1, { productId: 1, quantity: 2 });
    const itemId = cart.items[0].orderDetailId;

    const updated = await repository.updateItem(1, itemId, 4);
    expect(updated.items[0].quantity).toBe(4);
    expect(updated.total).toBe(340);

    await repository.removeItem(1, itemId);
    expect((await repository.findByBranchId(1)).items).toEqual([]);
    await expect(repository.updateItem(1, itemId, 1)).rejects.toMatchObject({ statusCode: 404 });
  });
});