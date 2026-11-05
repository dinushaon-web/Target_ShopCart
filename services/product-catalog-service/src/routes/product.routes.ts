/**
 * Product Routes
 * 
 * Defines HTTP routes for product endpoints
 * Follows /api/v1/{resource} convention
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const productController = new ProductController();

/**
 * GET /api/v1/products
 * Public endpoint - no authentication required
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    await productController.getAllProducts(req, res);
  })
);

/**
 * GET /api/v1/products/:productId
 * Public endpoint - no authentication required
 */
router.get(
  '/:productId',
  asyncHandler(async (req, res) => {
    await productController.getProductById(req, res);
  })
);

/**
 * PATCH /api/v1/products/:productId/stock
 * Protected endpoint - requires JWT authentication
 */
router.patch(
  '/:productId/stock',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await productController.decrementStock(req, res);
  })
);

export default router;
