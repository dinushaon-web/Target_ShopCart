/**
 * Cart Routes
 * 
 * Defines HTTP routes for cart endpoints
 * All routes require authentication
 */

import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/cart
 * Get user's cart
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    await cartController.getCart(req, res);
  })
);

/**
 * POST /api/v1/cart/items
 * Add item to cart
 */
router.post(
  '/items',
  asyncHandler(async (req, res) => {
    await cartController.addItemToCart(req, res);
  })
);

/**
 * PUT /api/v1/cart/items/:productId
 * Update cart item quantity
 */
router.put(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    await cartController.updateCartItemQuantity(req, res);
  })
);

/**
 * DELETE /api/v1/cart/items/:productId
 * Remove item from cart
 */
router.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    await cartController.removeCartItem(req, res);
  })
);

export default router;
