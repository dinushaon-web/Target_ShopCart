/**
 * Cart routes
 * Defines REST API endpoints following /api/v1/{resource} convention
 */

import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { validate, uuidSchema } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const cartController = new CartController();

// Validation schemas
const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().min(1).max(999),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().min(1).max(999),
});

/**
 * @route   GET /api/v1/cart
 * @desc    Get current user's cart
 * @access  Private (requires Cognito authentication)
 */
router.get('/', cartController.getCart);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart
 * @access  Private
 */
router.post(
  '/items',
  validate(addCartItemSchema, 'body'),
  cartController.addItem
);

/**
 * @route   PUT /api/v1/cart/items/:productId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put(
  '/items/:productId',
  validate(uuidSchema, 'params'),
  validate(updateCartItemSchema, 'body'),
  cartController.updateItem
);

/**
 * @route   DELETE /api/v1/cart/items/:productId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete(
  '/items/:productId',
  validate(uuidSchema, 'params'),
  cartController.removeItem
);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear cart
 * @access  Private
 */
router.delete('/', cartController.clearCart);

export default router;
