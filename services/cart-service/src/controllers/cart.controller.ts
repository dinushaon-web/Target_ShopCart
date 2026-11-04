/**
 * Cart Controller - HTTP request handling layer
 * Replaces legacy CartServlet with Express.js REST endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { AddCartItemDTO, UpdateCartItemDTO } from '../models/cart.model';
import { ApiResponse } from '../models/api-response.model';
import logger from '../utils/logger.util';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * Get current user's cart
   * GET /api/v1/cart
   */
  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In production, userId would come from AWS API Gateway context after Cognito authentication
      // For now, we'll use a header or default value
      const userId = req.headers['x-user-id'] as string || 'test-user-id';

      const cart = await this.cartService.getCart(userId);

      const response: ApiResponse<any> = {
        data: cart,
      };

      logger.info('Cart retrieved', { userId, itemCount: cart.items.length });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add item to cart
   * POST /api/v1/cart/items
   */
  addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string || 'test-user-id';
      const dto: AddCartItemDTO = req.body;

      const cart = await this.cartService.addItemToCart(userId, dto);

      const response: ApiResponse<any> = {
        data: cart,
      };

      logger.info('Item added to cart', { userId, productId: dto.productId });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update cart item quantity
   * PUT /api/v1/cart/items/:productId
   */
  updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string || 'test-user-id';
      const { productId } = req.params;
      const dto: UpdateCartItemDTO = req.body;

      const cart = await this.cartService.updateCartItem(userId, productId, dto);

      const response: ApiResponse<any> = {
        data: cart,
      };

      logger.info('Cart item updated', { userId, productId });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove item from cart
   * DELETE /api/v1/cart/items/:productId
   */
  removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string || 'test-user-id';
      const { productId } = req.params;

      await this.cartService.removeCartItem(userId, productId);

      logger.info('Cart item removed', { userId, productId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear cart
   * DELETE /api/v1/cart
   */
  clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string || 'test-user-id';

      await this.cartService.clearCart(userId);

      logger.info('Cart cleared', { userId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
