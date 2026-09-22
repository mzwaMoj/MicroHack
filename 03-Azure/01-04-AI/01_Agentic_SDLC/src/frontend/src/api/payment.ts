import axios from 'axios';
import { api, CART_BRANCH_ID } from './config';
import type { CheckoutRequest, PaymentConfirmation, PaymentSetup } from '../types/payment';

const paymentUrl = `${api.baseURL}${api.endpoints.cart}/${CART_BRANCH_ID}`;

export const paymentSetupQueryKey = ['payment-setup', CART_BRANCH_ID] as const;

export const fetchPaymentSetup = async (): Promise<PaymentSetup> => {
  const { data } = await axios.get<PaymentSetup>(`${paymentUrl}/payment/setup`);
  return data;
};

export const submitCheckout = async (request: CheckoutRequest): Promise<PaymentConfirmation> => {
  const { data } = await axios.post<PaymentConfirmation>(`${paymentUrl}/checkout`, request);
  return data;
};

export const getPaymentErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? 'Payment could not be completed.';
  }
  return 'Payment could not be completed.';
};