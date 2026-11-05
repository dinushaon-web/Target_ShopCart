/**
 * Cart Controller
 * 
 * HTTP request handlers for cart endpoints
 * Replaces CartServlet.java
 */

import { Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * GET /api/v1/cart
   * Retrieve user's cart
   */
  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    logger.info('Get cart request', { userId });

    const cart = await this.cartService.getCart(userId);

    res.status(200).json(cart);
  }

  /**
   * POST /api/v1/cart/items
   * Add item to cart
   */
  async addItemToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const { productId, productName, quantity, price } = req.body;

    // Validate required fields
    if (!productId || !productName || quantity === undefined || price === undefined) {
      throw new ValidationError(
        'Required fields are missing: productId, productName, quantity, price'
      );
    }

    logger.info('Add item to cart request', { 
      userId, 
      productId, 
      quantity, 
      price 
    });

    const cart = await this.cartService.addItemToCart(
      userId,
      productId,
      productName,
      quantity,
      price
    );

    res.status(200).json(cart);
  }

  /**
   * PUT /api/v1/cart/items/:productId
   * Update cart item quantity
   */
  async updateCartItemQuantity(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (quantity === undefined) {
      throw new ValidationError('Quantity is required');
    }

    logger.info('Update cart item quantity request', { 
      userId, 
      productId, 
      quantity 
    });

    const cart = await this.cartService.updateCartItemQuantity(
      userId,
      productId,
      quantity
    );

    res.status(200).json(cart);
  }

  /**
   * DELETE /api/v1/cart/items/:productId
   * Remove item from cart
   */
  async removeCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const { productId } = req.params;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    logger.info('Remove cart item request', { userId, productId });

    const cart = await this.cartService.removeCartItem(userId, productId);

    res.status(200).json(cart);
  }
}
