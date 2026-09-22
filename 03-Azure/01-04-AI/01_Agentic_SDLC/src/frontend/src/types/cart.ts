export interface CartItem {
  orderDetailId: number;
  productId: number;
  name: string;
  imgName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  orderId: number | null;
  branchId: number;
  items: CartItem[];
  total: number;
}

export interface AddCartItemRequest {
  productId: number;
  quantity: number;
}