/**
 * Cart Controller
 * 
 * HTTP request handlers for cart operations.
 * Replaces legacy CartServlet.java.
 * 
 * Endpoints:
 * - GET    /api/v1/cart              - Get user's cart
 * - POST   /api/v1/cart/items        - Add item to cart
 * - PUT    /api/v1/cart/items/:id    - Update item quantity
 * - DELETE /api/v1/cart/items/:id    - Remove item from cart
 * - DELETE /api/v1/cart              - Clear entire cart
 */

import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import {
  AddCartItemRequest,
  UpdateCartItemRequest,
  CartItemNotFoundError,
  InsufficientStockError,
  ValidationError,
} from '../models/cart.model';
import { logger } from '../utils/logger.util';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * GET /api/v1/cart
   * Get user's cart with all items
   */
  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!; // Set by auth middleware

      logger.info('GET /cart request', { userId });

      const cart = await this.cartService.getCart(userId);

      res.status(200).json({
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/cart/items
   * Add item to cart
   */
  addCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const request: AddCartItemRequest = req.body;

      logger.info('POST /cart/items request', { userId, request });

      // Validate request body
      if (!request.productId || !request.quantity) {
        throw new ValidationError('productId and quantity are required');
      }

      const cartItem = await this.cartService.addItemToCart(userId, request);

      res.status(201)
        .location(`/api/v1/cart/items/${cartItem.productId}`)
        .json({
          data: cartItem,
        });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/cart/items/:productId
   * Update cart item quantity
   */
  updateCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { productId } = req.params;
      const request: UpdateCartItemRequest = req.body;

      logger.info('PUT /cart/items/:productId request', { userId, productId, request });

      // Validate request body
      if (!request.quantity) {
        throw new ValidationError('quantity is required');
      }

      const cartItem = await this.cartService.updateCartItemQuantity(
        userId,
        productId,
        request
      );

      res.status(200).json({
        data: cartItem,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/cart/items/:productId
   * Remove item from cart
   */
  removeCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { productId } = req.params;

      logger.info('DELETE /cart/items/:productId request', { userId, productId });

      await this.cartService.removeCartItem(userId, productId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/cart
   * Clear entire cart
   */
  clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info('DELETE /cart request', { userId });

      await this.cartService.clearCart(userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
