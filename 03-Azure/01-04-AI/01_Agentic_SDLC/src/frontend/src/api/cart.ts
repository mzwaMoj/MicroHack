import axios from 'axios';
import { api, CART_BRANCH_ID } from './config';
import type { AddCartItemRequest, Cart } from '../types/cart';

const cartUrl = `${api.baseURL}${api.endpoints.cart}/${CART_BRANCH_ID}`;

export const cartQueryKey = ['cart', CART_BRANCH_ID] as const;

export const fetchCart = async (): Promise<Cart> => {
  const { data } = await axios.get<Cart>(cartUrl);
  return data;
};

export const addCartItem = async (request: AddCartItemRequest): Promise<Cart> => {
  const { data } = await axios.post<Cart>(`${cartUrl}/items`, request);
  return data;
};

export const updateCartItem = async (itemId: number, quantity: number): Promise<Cart> => {
  const { data } = await axios.put<Cart>(`${cartUrl}/items/${itemId}`, { quantity });
  return data;
};

export const removeCartItem = async (itemId: number): Promise<void> => {
  await axios.delete(`${cartUrl}/items/${itemId}`);
};