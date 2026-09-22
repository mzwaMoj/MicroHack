export type SimulatedPaymentMethod = 'demo-card-approved' | 'demo-card-declined';

export interface PaymentSetup {
  issuer: string;
  accountName: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export interface CheckoutRequest {
  cardholderName: string;
  paymentMethod: SimulatedPaymentMethod;
  otp: string;
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