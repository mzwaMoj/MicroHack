import express from 'express';
import { AddCartItemRequest, UpdateCartItemRequest } from '../models/cart';
import { getCartRepository } from '../repositories/cartRepo';
import { ValidationError } from '../utils/errors';
import { CheckoutRequest, SimulatedPaymentMethod } from '../models/payment';
import { getPaymentRepository } from '../repositories/paymentRepo';
import { getPaymentSetup, verifyPaymentOtp } from '../services/paymentService';

const router = express.Router();

const positiveInteger = (value: unknown, name: string): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError(`${name} must be a positive integer`);
  }
  return parsed;
};

const paymentMethods: SimulatedPaymentMethod[] = ['demo-card-approved', 'demo-card-declined'];

const checkoutRequest = (body: unknown): CheckoutRequest => {
  const value = body as Partial<CheckoutRequest> | null;
  const cardholderName = value?.cardholderName?.trim() ?? '';
  if (cardholderName.length < 2 || cardholderName.length > 100) {
    throw new ValidationError('cardholderName must be between 2 and 100 characters');
  }
  if (!value?.paymentMethod || !paymentMethods.includes(value.paymentMethod)) {
    throw new ValidationError('paymentMethod must be a supported simulated payment method');
  }
  if (!value.otp || !/^\d{6}$/.test(value.otp)) {
    throw new ValidationError('otp must be a 6-digit code');
  }

  return { cardholderName, paymentMethod: value.paymentMethod, otp: value.otp };
};

/**
 * @swagger
 * /api/cart/{branchId}:
 *   get:
 *     summary: Get the active cart for a branch
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Active or empty cart
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 * /api/cart/{branchId}/items:
 *   post:
 *     summary: Add a product to the active cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AddCartItemRequest' }
 *     responses:
 *       200:
 *         description: Updated cart
 * /api/cart/{branchId}/items/{itemId}:
 *   put:
 *     summary: Set a cart item's quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateCartItemRequest' }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Item removed }
 * /api/cart/{branchId}/payment/setup:
 *   get:
 *     summary: Get Google Authenticator-compatible setup details for simulated payment
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: TOTP setup details
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentSetup' }
 * /api/cart/{branchId}/checkout:
 *   post:
 *     summary: Complete a simulated payment and convert the cart into an order
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutRequest' }
 *     responses:
 *       200:
 *         description: Payment approved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentConfirmation' }
 *       402: { description: Simulated payment declined }
 */

router.get('/:branchId/payment/setup', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    await (await getCartRepository()).findByBranchId(branchId);
    res.json(await getPaymentSetup(branchId));
  } catch (error) {
    next(error);
  }
});

router.post('/:branchId/checkout', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    const payment = checkoutRequest(req.body);
    verifyPaymentOtp(payment.otp);
    res.json(await (await getPaymentRepository()).checkout(branchId, payment.paymentMethod));
  } catch (error) {
    next(error);
  }
});

router.get('/:branchId', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    res.json(await (await getCartRepository()).findByBranchId(branchId));
  } catch (error) {
    next(error);
  }
});

router.post('/:branchId/items', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    const request: AddCartItemRequest = {
      productId: positiveInteger(req.body?.productId, 'productId'),
      quantity: positiveInteger(req.body?.quantity, 'quantity'),
    };
    res.json(await (await getCartRepository()).addItem(branchId, request));
  } catch (error) {
    next(error);
  }
});

router.put('/:branchId/items/:itemId', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    const itemId = positiveInteger(req.params.itemId, 'itemId');
    const request: UpdateCartItemRequest = {
      quantity: positiveInteger(req.body?.quantity, 'quantity'),
    };
    res.json(await (await getCartRepository()).updateItem(branchId, itemId, request.quantity));
  } catch (error) {
    next(error);
  }
});

router.delete('/:branchId/items/:itemId', async (req, res, next) => {
  try {
    const branchId = positiveInteger(req.params.branchId, 'branchId');
    const itemId = positiveInteger(req.params.itemId, 'itemId');
    await (await getCartRepository()).removeItem(branchId, itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;