/**
 * Cart Service
 * 
 * Business logic layer for cart operations.
 * Replaces legacy CartServlet business logic.
 * 
 * Responsibilities:
 * - Validate cart operations
 * - Coordinate between cart and product repositories
 * - Enforce business rules
 * - Handle cart item calculations
 */

import { CartRepository } from '../repositories/cart.repository';
import { ProductRepository } from '../repositories/product.repository';
import {
  Cart,
  CartItem,
  AddCartItemRequest,
  UpdateCartItemRequest,
  CartItemNotFoundError,
  InsufficientStockError,
  ValidationError,
  validateQuantity,
  validateProductId,
  calculateCartTotals,
} from '../models/cart.model';
import { logger } from '../utils/logger.util';

export class CartService {
  private cartRepository: CartRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.cartRepository = new CartRepository();
    this.productRepository = new ProductRepository();
  }

  /**
   * Get user's cart with all items
   */
  async getCart(userId: string): Promise<Cart> {
    try {
      logger.info('Getting cart', { userId });

      const items = await this.cartRepository.getCartItems(userId);
      const totals = calculateCartTotals(items);

      const cart: Cart = {
        userId,
        items,
        ...totals,
      };

      logger.info('Cart retrieved successfully', { userId, itemCount: items.length });
      return cart;
    } catch (error) {
      logger.error('Error getting cart', { userId, error });
      throw error;
    }
  }

  /**
   * Add item to cart
   * Replaces: sp_add_cart_item stored procedure logic
   * 
   * Business Rules:
   * - Product must exist
   * - Product must have sufficient stock
   * - Price must be > 0 (business rule from legacy ProductServlet)
   * - If item already in cart, increment quantity
   */
  async addItemToCart(
    userId: string,
    request: AddCartItemRequest
  ): Promise<CartItem> {
    try {
      const { productId, quantity } = request;

      // Validate inputs
      validateProductId(productId);
      validateQuantity(quantity);

      logger.info('Adding item to cart', { userId, productId, quantity });

      // Fetch product details
      const product = await this.productRepository.getProductById(productId);
      if (!product) {
        throw new ValidationError(`Product with ID '${productId}' not found or no longer available`);
      }

      // Business rule: price must be > 0 (from legacy ProductServlet line 23)
      if (product.price <= 0) {
        throw new ValidationError('Product price must be greater than 0');
      }

      // Check if item already exists in cart
      const existingItem = await this.cartRepository.getCartItem(userId, productId);
      const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      // Validate stock availability for total quantity
      if (product.stock < totalQuantity) {
        throw new InsufficientStockError(productId, totalQuantity, product.stock);
      }

      // Add or update cart item (upsert)
      const cartItem = await this.cartRepository.addOrUpdateCartItem(
        userId,
        productId,
        product.name,
        quantity,
        product.price
      );

      logger.info('Item added to cart successfully', {
        userId,
        productId,
        newQuantity: cartItem.quantity,
      });

      return cartItem;
    } catch (error) {
      logger.error('Error adding item to cart', { userId, request, error });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * 
   * Business Rules:
   * - Item must exist in cart
   * - Product must have sufficient stock for new quantity
   */
  async updateCartItemQuantity(
    userId: string,
    productId: string,
    request: UpdateCartItemRequest
  ): Promise<CartItem> {
    try {
      const { quantity } = request;

      // Validate inputs
      validateProductId(productId);
      validateQuantity(quantity);

      logger.info('Updating cart item quantity', { userId, productId, quantity });

      // Check if item exists in cart
      const existingItem = await this.cartRepository.getCartItem(userId, productId);
      if (!existingItem) {
        throw new CartItemNotFoundError(productId);
      }

      // Fetch product to validate stock
      const product = await this.productRepository.getProductById(productId);
      if (!product) {
        throw new ValidationError(`Product with ID '${productId}' not found or no longer available`);
      }

      // Validate stock availability
      if (product.stock < quantity) {
        throw new InsufficientStockError(productId, quantity, product.stock);
      }

      // Update quantity
      const updatedItem = await this.cartRepository.updateCartItemQuantity(
        userId,
        productId,
        quantity
      );

      logger.info('Cart item quantity updated successfully', {
        userId,
        productId,
        newQuantity: quantity,
      });

      return updatedItem;
    } catch (error) {
      logger.error('Error updating cart item quantity', { userId, productId, request, error });
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(userId: string, productId: string): Promise<void> {
    try {
      // Validate product ID
      validateProductId(productId);

      logger.info('Removing cart item', { userId, productId });

      // Check if item exists
      const existingItem = await this.cartRepository.getCartItem(userId, productId);
      if (!existingItem) {
        throw new CartItemNotFoundError(productId);
      }

      await this.cartRepository.removeCartItem(userId, productId);

      logger.info('Cart item removed successfully', { userId, productId });
    } catch (error) {
      logger.error('Error removing cart item', { userId, productId, error });
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      logger.info('Clearing cart', { userId });

      await this.cartRepository.clearCart(userId);

      logger.info('Cart cleared successfully', { userId });
    } catch (error) {
      logger.error('Error clearing cart', { userId, error });
      throw error;
    }
  }
}
