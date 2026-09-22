import { DatabaseConnection, getDatabase } from '../db/sqlite';
import { AddCartItemRequest, Cart, CartItem } from '../models/cart';
import { NotFoundError } from '../utils/errors';

interface CartOrderRow {
  order_id: number;
}

interface CartItemRow {
  order_detail_id: number;
  product_id: number;
  name: string;
  img_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

interface ProductPriceRow {
  price: number;
  discount: number | null;
}

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export class CartRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async findByBranchId(branchId: number): Promise<Cart> {
    await this.requireBranch(branchId);
    const order = await this.db.get<CartOrderRow>(
      "SELECT order_id FROM orders WHERE branch_id = ? AND status = 'cart'",
      [branchId],
    );

    if (!order) {
      return { orderId: null, branchId, items: [], total: 0 };
    }

    const rows = await this.db.all<CartItemRow>(
      `SELECT od.order_detail_id, od.product_id, p.name, p.img_name, p.unit,
              od.quantity, od.unit_price
       FROM order_details od
       JOIN products p ON p.product_id = od.product_id
       WHERE od.order_id = ?
       ORDER BY od.order_detail_id`,
      [order.order_id],
    );
    const items: CartItem[] = rows.map((row) => ({
      orderDetailId: row.order_detail_id,
      productId: row.product_id,
      name: row.name,
      imgName: row.img_name,
      unit: row.unit,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      lineTotal: roundCurrency(row.quantity * row.unit_price),
    }));

    return {
      orderId: order.order_id,
      branchId,
      items,
      total: roundCurrency(items.reduce((total, item) => total + item.lineTotal, 0)),
    };
  }

  async addItem(branchId: number, request: AddCartItemRequest): Promise<Cart> {
    const transaction = this.db.db.transaction(() => {
      const branch = this.db.db.prepare('SELECT branch_id FROM branches WHERE branch_id = ?').get(branchId);
      if (!branch) {
        throw new NotFoundError('Branch', branchId);
      }

      const product = this.db.db
        .prepare('SELECT price, discount FROM products WHERE product_id = ?')
        .get(request.productId) as ProductPriceRow | undefined;
      if (!product) {
        throw new NotFoundError('Product', request.productId);
      }

      let order = this.db.db
        .prepare("SELECT order_id FROM orders WHERE branch_id = ? AND status = 'cart'")
        .get(branchId) as CartOrderRow | undefined;
      if (!order) {
        const result = this.db.db
          .prepare(
            "INSERT INTO orders (branch_id, order_date, name, description, status) VALUES (?, ?, 'Shopping Cart', 'Active shopping cart', 'cart')",
          )
          .run(branchId, new Date().toISOString());
        order = { order_id: Number(result.lastInsertRowid) };
      }

      const existing = this.db.db
        .prepare('SELECT order_detail_id FROM order_details WHERE order_id = ? AND product_id = ?')
        .get(order.order_id, request.productId) as { order_detail_id: number } | undefined;
      if (existing) {
        this.db.db
          .prepare('UPDATE order_details SET quantity = quantity + ? WHERE order_detail_id = ?')
          .run(request.quantity, existing.order_detail_id);
      } else {
        const unitPrice = roundCurrency(product.price * (1 - (product.discount ?? 0)));
        this.db.db
          .prepare(
            'INSERT INTO order_details (order_id, product_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)',
          )
          .run(order.order_id, request.productId, request.quantity, unitPrice, 'Shopping cart item');
      }
    });

    transaction();
    return this.findByBranchId(branchId);
  }

  async updateItem(branchId: number, itemId: number, quantity: number): Promise<Cart> {
    await this.requireCartItem(branchId, itemId);
    await this.db.run('UPDATE order_details SET quantity = ? WHERE order_detail_id = ?', [quantity, itemId]);
    return this.findByBranchId(branchId);
  }

  async removeItem(branchId: number, itemId: number): Promise<void> {
    await this.requireCartItem(branchId, itemId);
    await this.db.run('DELETE FROM order_details WHERE order_detail_id = ?', [itemId]);
  }

  private async requireBranch(branchId: number): Promise<void> {
    const branch = await this.db.get('SELECT branch_id FROM branches WHERE branch_id = ?', [branchId]);
    if (!branch) {
      throw new NotFoundError('Branch', branchId);
    }
  }

  private async requireCartItem(branchId: number, itemId: number): Promise<void> {
    const item = await this.db.get(
      `SELECT od.order_detail_id
       FROM order_details od
       JOIN orders o ON o.order_id = od.order_id
       WHERE od.order_detail_id = ? AND o.branch_id = ? AND o.status = 'cart'`,
      [itemId, branchId],
    );
    if (!item) {
      throw new NotFoundError('Cart item', itemId);
    }
  }
}

export async function getCartRepository(isTest: boolean = false): Promise<CartRepository> {
  return new CartRepository(await getDatabase(isTest));
}