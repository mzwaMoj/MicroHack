/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         orderDetailId: { type: integer }
 *         productId: { type: integer }
 *         name: { type: string }
 *         imgName: { type: string }
 *         unit: { type: string }
 *         quantity: { type: integer }
 *         unitPrice: { type: number, format: float }
 *         lineTotal: { type: number, format: float }
 *     Cart:
 *       type: object
 *       properties:
 *         orderId: { type: integer, nullable: true }
 *         branchId: { type: integer }
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/CartItem' }
 *         total: { type: number, format: float }
 *     AddCartItemRequest:
 *       type: object
 *       required: [productId, quantity]
 *       properties:
 *         productId: { type: integer, minimum: 1 }
 *         quantity: { type: integer, minimum: 1 }
 *     UpdateCartItemRequest:
 *       type: object
 *       required: [quantity]
 *       properties:
 *         quantity: { type: integer, minimum: 1 }
 */

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

export interface UpdateCartItemRequest {
  quantity: number;
}