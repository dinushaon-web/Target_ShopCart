/**
 * Cart Service
 * 
 * Business logic layer for cart operations
 * Enforces business rules and validation
 */

import { CartRepository } from '../repositories/cart.repository';
import { Cart } from '../models/cart.model';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class CartService {
  private cartRepository: CartRepository;

  constructor() {
    this.cartRepository = new CartRepository();
  }

  /**
   * Retrieves a user's cart
   */
  async getCart(userId: string): Promise<Cart> {
    logger.info('Get cart request', { userId });
    return await this.cartRepository.getCartByUserId(userId);
  }

  /**
   * Adds an item to the cart
   * Business rules:
   * - quantity must be > 0
   * - price must be > 0
   * - productId must be valid UUID
   */
  async addItemToCart(
    userId: string,
    productId: string,
    productName: string,
    quantity: number,
    price: number
  ): Promise<Cart> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new ValidationError("The 'productId' must be a valid UUID format");
    }

    // Validate quantity
    if (quantity <= 0) {
      throw new ValidationError("The 'quantity' field must be greater than 0");
    }

    // Validate price
    if (price <= 0) {
      throw new ValidationError("The 'price' field must be greater than 0");
    }

    // Validate productName
    if (!productName || productName.trim().length === 0) {
      throw new ValidationError("The 'productName' field is required");
    }

    logger.info('Add item to cart', { userId, productId, quantity, price });

    return await this.cartRepository.addOrUpdateCartItem(
      userId,
      productId,
      productName,
      quantity,
      price
    );
  }

  /**
   * Updates the quantity of a cart item
   * Business rule: quantity must be >= 0 (0 removes the item)
   */
  async updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new ValidationError("The 'productId' must be a valid UUID format");
    }

    // Validate quantity
    if (quantity < 0) {
      throw new ValidationError("The 'quantity' field must be greater than or equal to 0");
    }

    logger.info('Update cart item quantity', { userId, productId, quantity });

    return await this.cartRepository.updateCartItemQuantity(userId, productId, quantity);
  }

  /**
   * Removes an item from the cart
   */
  async removeCartItem(userId: string, productId: string): Promise<Cart> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new ValidationError("The 'productId' must be a valid UUID format");
    }

    logger.info('Remove cart item', { userId, productId });

    return await this.cartRepository.removeCartItem(userId, productId);
  }
}
