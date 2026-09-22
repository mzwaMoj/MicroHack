/**
 * Repository for orders data access
 */

import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { Order } from '../models/order';
import { OrderHistoryItem } from '../models/orderHistory';
import { handleDatabaseError, NotFoundError } from '../utils/errors';
import { buildInsertSQL, buildUpdateSQL, objectToCamelCase, mapDatabaseRows, DatabaseRow } from '../utils/sql';

interface OrderHistoryRow {
  order_id: number;
  branch_id: number;
  order_date: string;
  name: string;
  description: string | null;
  status: string;
  order_detail_id: number | null;
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  notes: string | null;
}

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export class OrdersRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Get all orders
   */
  async findAll(): Promise<Order[]> {
    try {
      const rows = await this.db.all<DatabaseRow>('SELECT * FROM orders ORDER BY order_id');
      return mapDatabaseRows<Order>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get order by ID
   */
  async findById(id: number): Promise<Order | null> {
    try {
      const row = await this.db.get<DatabaseRow>('SELECT * FROM orders WHERE order_id = ?', [id]);
      return row ? objectToCamelCase<Order>(row) : null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Create a new order
   */
  async create(order: Omit<Order, 'orderId'>): Promise<Order> {
    try {
      const { sql, values } = buildInsertSQL('orders', order);
      const result = await this.db.run(sql, values);

      const createdOrder = await this.findById(result.lastID || 0);
      if (!createdOrder) {
        throw new Error('Failed to retrieve created order');
      }

      return createdOrder;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Update order by ID
   */
  async update(id: number, order: Partial<Omit<Order, 'orderId'>>): Promise<Order> {
    try {
      const { sql, values } = buildUpdateSQL('orders', order, 'order_id = ?');
      const result = await this.db.run(sql, [...values, id]);

      if (result.changes === 0) {
        throw new NotFoundError('Order', id);
      }

      const updatedOrder = await this.findById(id);
      if (!updatedOrder) {
        throw new Error('Failed to retrieve updated order');
      }

      return updatedOrder;
    } catch (error) {
      handleDatabaseError(error, 'Order', id);
    }
  }

  /**
   * Delete order by ID
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await this.db.run('DELETE FROM orders WHERE order_id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('Order', id);
      }
    } catch (error) {
      handleDatabaseError(error, 'Order', id);
    }
  }

  /**
   * Check if order exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM orders WHERE order_id = ?',
        [id],
      );
      return (result?.count || 0) > 0;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Find orders by branch ID
   */
  async findByBranchId(branchId: number): Promise<Order[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(
        'SELECT * FROM orders WHERE branch_id = ? ORDER BY order_date DESC',
        [branchId],
      );
      return mapDatabaseRows<Order>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Find completed order history with line items by branch ID
   */
  async findHistoryByBranchId(branchId: number): Promise<OrderHistoryItem[]> {
    try {
      const branch = await this.db.get('SELECT branch_id FROM branches WHERE branch_id = ?', [branchId]);
      if (!branch) {
        throw new NotFoundError('Branch', branchId);
      }

      const rows = await this.db.all<OrderHistoryRow>(
        `SELECT o.order_id, o.branch_id, o.order_date, o.name, o.description, o.status,
                od.order_detail_id, od.product_id, p.name AS product_name,
                od.quantity, od.unit_price, od.notes
         FROM orders o
         LEFT JOIN order_details od ON od.order_id = o.order_id
         LEFT JOIN products p ON p.product_id = od.product_id
         WHERE o.branch_id = ? AND o.status <> 'cart'
         ORDER BY o.order_date DESC, o.order_id DESC, od.order_detail_id`,
        [branchId],
      );

      const history = new Map<number, OrderHistoryItem>();
      for (const row of rows) {
        let order = history.get(row.order_id);
        if (!order) {
          order = {
            orderId: row.order_id,
            branchId: row.branch_id,
            orderDate: row.order_date,
            name: row.name,
            description: row.description,
            status: row.status,
            total: 0,
            details: [],
          };
          history.set(row.order_id, order);
        }

        if (row.order_detail_id !== null && row.product_id !== null && row.quantity !== null && row.unit_price !== null) {
          const lineTotal = roundCurrency(row.quantity * row.unit_price);
          order.details.push({
            orderDetailId: row.order_detail_id,
            productId: row.product_id,
            productName: row.product_name ?? 'Unknown product',
            quantity: row.quantity,
            unitPrice: row.unit_price,
            lineTotal,
            notes: row.notes,
          });
          order.total = roundCurrency(order.total + lineTotal);
        }
      }

      return [...history.values()];
    } catch (error) {
      handleDatabaseError(error, 'Branch', branchId);
    }
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: string): Promise<Order[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(
        'SELECT * FROM orders WHERE status = ? ORDER BY order_date DESC',
        [status],
      );
      return mapDatabaseRows<Order>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Find orders by date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(
        'SELECT * FROM orders WHERE order_date >= ? AND order_date <= ? ORDER BY order_date DESC',
        [startDate, endDate],
      );
      return mapDatabaseRows<Order>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

// Factory function to create repository instance
export async function createOrdersRepository(isTest: boolean = false): Promise<OrdersRepository> {
  const db = await getDatabase(isTest);
  return new OrdersRepository(db);
}

// Singleton instance for default usage
let ordersRepo: OrdersRepository | null = null;

export async function getOrdersRepository(isTest: boolean = false): Promise<OrdersRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createOrdersRepository(true);
  }
  if (!ordersRepo) {
    ordersRepo = await createOrdersRepository(false);
  }
  return ordersRepo;
}
