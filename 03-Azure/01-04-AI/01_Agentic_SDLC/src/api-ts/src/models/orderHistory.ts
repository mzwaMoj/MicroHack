/**
 * @swagger
 * components:
 *   schemas:
 *     OrderHistoryDetail:
 *       type: object
 *       required:
 *         - orderDetailId
 *         - productId
 *         - productName
 *         - quantity
 *         - unitPrice
 *         - lineTotal
 *       properties:
 *         orderDetailId:
 *           type: integer
 *         productId:
 *           type: integer
 *         productName:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: number
 *           format: float
 *         lineTotal:
 *           type: number
 *           format: float
 *         notes:
 *           type: string
 *     OrderHistoryItem:
 *       type: object
 *       required:
 *         - orderId
 *         - branchId
 *         - orderDate
 *         - name
 *         - status
 *         - total
 *         - details
 *       properties:
 *         orderId:
 *           type: integer
 *         branchId:
 *           type: integer
 *         orderDate:
 *           type: string
 *           format: date-time
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         total:
 *           type: number
 *           format: float
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderHistoryDetail'
 */
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