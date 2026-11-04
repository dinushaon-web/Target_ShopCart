/**
 * Product routes
 * Defines REST API endpoints following /api/v1/{resource} convention
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import {
  validate,
  createProductSchema,
  updateProductSchema,
  stockUpdateSchema,
  productFiltersSchema,
  uuidSchema,
} from '../middleware/validation.middleware';

const router = Router();
const productController = new ProductController();

/**
 * @route   GET /api/v1/products
 * @desc    List all products with pagination and filtering
 * @access  Public (should be protected by AWS API Gateway Cognito authorizer)
 */
router.get(
  '/',
  validate(productFiltersSchema, 'query'),
  productController.listProducts
);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    Get product by ID
 * @access  Public
 */
router.get(
  '/:productId',
  validate(uuidSchema, 'params'),
  productController.getProduct
);

/**
 * @route   POST /api/v1/products
 * @desc    Create a new product
 * @access  Admin only (should be protected by AWS API Gateway with admin role)
 */
router.post(
  '/',
  validate(createProductSchema, 'body'),
  productController.createProduct
);

/**
 * @route   PUT /api/v1/products/:productId
 * @desc    Update product
 * @access  Admin only
 */
router.put(
  '/:productId',
  validate(uuidSchema, 'params'),
  validate(updateProductSchema, 'body'),
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    Delete product (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:productId',
  validate(uuidSchema, 'params'),
  productController.deleteProduct
);

/**
 * @route   PATCH /api/v1/products/:productId/stock
 * @desc    Update product stock atomically
 * @access  Internal (should be called by Cart Service)
 */
router.patch(
  '/:productId/stock',
  validate(uuidSchema, 'params'),
  validate(stockUpdateSchema, 'body'),
  productController.updateStock
);

export default router;
