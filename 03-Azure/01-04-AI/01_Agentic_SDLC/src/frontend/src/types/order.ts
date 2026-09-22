export interface OrderHistoryDetail {
  orderDetailId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

export interface OrderHistoryItem {
  orderId: number;
  branchId: number;
  orderDate: string;
  name: string;
  description: string | null;
  status: string;
  total: number;
  details: OrderHistoryDetail[];
}