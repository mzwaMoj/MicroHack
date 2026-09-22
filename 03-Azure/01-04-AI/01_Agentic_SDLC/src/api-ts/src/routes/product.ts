/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API endpoints for managing products
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Returns products with optional search and filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive text search across product name, SKU, and description
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *         description: Filter products by supplier ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum product price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum product price
 *     responses:
 *       200:
 *         description: List of matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid filter parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: "Validation error: minPrice cannot be greater than maxPrice"
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */

import express from 'express';
import { Product } from '../models/product';
import { getProductsRepository, ProductSearchFilters } from '../repositories/productsRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = express.Router();

function parseOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be a single value`);
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return undefined;
  }

  const parsed = Number(stringValue);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  return parsed;
}

function parseProductFilters(query: express.Request['query']): ProductSearchFilters {
  const search = Array.isArray(query.search) ? query.search[0] : query.search;
  const supplierId = parseOptionalNumber(query.supplierId, 'supplierId');
  const minPrice = parseOptionalNumber(query.minPrice, 'minPrice');
  const maxPrice = parseOptionalNumber(query.maxPrice, 'maxPrice');

  if (supplierId !== undefined && (!Number.isInteger(supplierId) || supplierId <= 0)) {
    throw new ValidationError('supplierId must be a positive integer');
  }

  if (minPrice !== undefined && minPrice < 0) {
    throw new ValidationError('minPrice must be greater than or equal to 0');
  }

  if (maxPrice !== undefined && maxPrice < 0) {
    throw new ValidationError('maxPrice must be greater than or equal to 0');
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ValidationError('minPrice cannot be greater than maxPrice');
  }

  return {
    search: typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined,
    supplierId,
    minPrice,
    maxPrice,
  };
}

// Create a new product
router.post('/', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const newProduct = await repo.create(req.body as Omit<Product, 'productId'>);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
});

// Get all products
router.get('/', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const filters = parseProductFilters(req.query);
    const products = await repo.search(filters);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Get a product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const productId = parseInt(req.params.id);
    const product = await repo.findById(productId);
    if (!product) {
      throw new NotFoundError('Product', productId);
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Update a product by ID
router.put('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const updatedProduct = await repo.update(parseInt(req.params.id), req.body);
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
});

// Delete a product by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    await repo.delete(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
