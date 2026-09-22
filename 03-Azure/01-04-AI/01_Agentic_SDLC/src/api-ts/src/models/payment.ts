/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentSetup:
 *       type: object
 *       properties:
 *         issuer: { type: string }
 *         accountName: { type: string }
 *         qrCodeDataUrl: { type: string }
 *         manualEntryKey: { type: string }
 *     CheckoutRequest:
 *       type: object
 *       required: [cardholderName, paymentMethod, otp]
 *       properties:
 *         cardholderName: { type: string, minLength: 2, maxLength: 100 }
 *         paymentMethod:
 *           type: string
 *           enum: [demo-card-approved, demo-card-declined]
 *         otp: { type: string, pattern: '^\\d{6}$' }
 *     PaymentConfirmation:
 *       type: object
 *       properties:
 *         paymentAttemptId: { type: integer }
 *         orderId: { type: integer }
 *         branchId: { type: integer }
 *         amount: { type: number, format: float }
 *         providerReference: { type: string }
 *         status: { type: string, enum: [approved] }
 *         orderStatus: { type: string, enum: [pending] }
 *         paidAt: { type: string, format: date-time }
 */

export type SimulatedPaymentMethod = 'demo-card-approved' | 'demo-card-declined';

export interface CheckoutRequest {
  cardholderName: string;
  paymentMethod: SimulatedPaymentMethod;
  otp: string;
}

export interface PaymentSetup {
  issuer: string;
  accountName: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export interface PaymentConfirmation {
  paymentAttemptId: number;
  orderId: number;
  branchId: number;
  amount: number;
  providerReference: string;
  status: 'approved';
  orderStatus: 'pending';
  paidAt: string;
}