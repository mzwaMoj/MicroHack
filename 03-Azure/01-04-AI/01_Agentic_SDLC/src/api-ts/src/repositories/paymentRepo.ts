import { DatabaseConnection, getDatabase } from '../db/sqlite';
import { PaymentConfirmation, SimulatedPaymentMethod } from '../models/payment';
import { authorizeSimulatedPayment } from '../services/paymentService';
import { NotFoundError, PaymentDeclinedError, ValidationError } from '../utils/errors';

interface CartPaymentRow {
  order_id: number;
  amount_cents: number;
}

const roundCurrency = (cents: number): number => cents / 100;

export class PaymentRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async checkout(branchId: number, paymentMethod: SimulatedPaymentMethod): Promise<PaymentConfirmation> {
    const transaction = this.db.db.transaction(() => {
      const branch = this.db.db.prepare('SELECT branch_id FROM branches WHERE branch_id = ?').get(branchId);
      if (!branch) {
        throw new NotFoundError('Branch', branchId);
      }

      const cart = this.db.db
        .prepare(
          `SELECT o.order_id, CAST(ROUND(SUM(od.quantity * od.unit_price) * 100) AS INTEGER) AS amount_cents
           FROM orders o
           LEFT JOIN order_details od ON od.order_id = o.order_id
           WHERE o.branch_id = ? AND o.status = 'cart'
           GROUP BY o.order_id`,
        )
        .get(branchId) as CartPaymentRow | undefined;

      if (!cart) {
        throw new NotFoundError('Cart', branchId);
      }
      if (!cart.amount_cents || cart.amount_cents < 1) {
        throw new ValidationError('The cart must contain at least one item before checkout');
      }

      const authorization = authorizeSimulatedPayment(paymentMethod);
      const createdAt = new Date().toISOString();
      const attempt = this.db.db
        .prepare(
          `INSERT INTO payment_attempts
             (order_id, provider, provider_reference, amount_cents, status, payment_method, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          cart.order_id,
          authorization.provider,
          authorization.providerReference,
          cart.amount_cents,
          authorization.approved ? 'approved' : 'declined',
          paymentMethod,
          createdAt,
        );

      if (!authorization.approved) {
        return { declined: true as const };
      }

      const update = this.db.db
        .prepare(
          `UPDATE orders
           SET status = 'pending', order_date = ?, name = ?, description = ?
           WHERE order_id = ? AND branch_id = ? AND status = 'cart'`,
        )
        .run(
          createdAt,
          `Order ${cart.order_id}`,
          'Paid through the simulated checkout flow',
          cart.order_id,
          branchId,
        );
      if (update.changes !== 1) {
        throw new ValidationError('The cart changed before payment could be completed');
      }

      return {
        declined: false as const,
        confirmation: {
          paymentAttemptId: Number(attempt.lastInsertRowid),
          orderId: cart.order_id,
          branchId,
          amount: roundCurrency(cart.amount_cents),
          providerReference: authorization.providerReference,
          status: 'approved' as const,
          orderStatus: 'pending' as const,
          paidAt: createdAt,
        },
      };
    });

    const result = transaction();
    if (result.declined) {
      throw new PaymentDeclinedError();
    }
    return result.confirmation;
  }
}

export async function getPaymentRepository(isTest: boolean = false): Promise<PaymentRepository> {
  return new PaymentRepository(await getDatabase(isTest));
}