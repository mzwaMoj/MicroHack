import axios from 'axios';
import { api, CART_BRANCH_ID } from './config';
import type { OrderHistoryItem } from '../types/order';

const orderHistoryUrl = `${api.baseURL}${api.endpoints.orders}/branch/${CART_BRANCH_ID}/history`;

export const orderHistoryQueryKey = ['order-history', CART_BRANCH_ID] as const;

export const fetchOrderHistory = async (): Promise<OrderHistoryItem[]> => {
  const { data } = await axios.get<OrderHistoryItem[]>(orderHistoryUrl);
  return data;
};