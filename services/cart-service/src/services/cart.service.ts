/**
 * Cart Service - Business logic layer
 * Implements business rules from legacy CartServlet and sp_add_cart_item
 */

import { CartRepository } from '../repositories/cart.repository';
import { getProductCatalogClient } from '../clients/product-catalog.client';
import { Cart, AddCartItemDTO, UpdateCartItemDTO } from '../models/cart.model';
import { ProductNotFoundError, InsufficientStockError, ValidationError } from '../middleware/error.middleware';
import logger from '../utils/logger.util';

export class CartService {
  private cartRepository: CartRepository;
  private productCatalogClient: ReturnType<typeof getProductCatalogClient>;

  constructor() {
    this.cartRepository = new CartRepository();
    this.productCatalogClient = getProductCatalogClient();
  }

  /**
   * Get user's cart with enriched product details
   * @param userId - User ID from Cognito JWT
   * @returns Cart with enriched items
   */
  async getCart(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.getCart(userId);
    
    if (!cart) {
      // Return empty cart
      return {
        userId,
        items: [],
        totalAmount: 0,
        itemCount: 0,
        updatedAt: new Date().toISOString(),
        expiresAt: 0,
      };
    }

    // Enrich items with current product data
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        try {
          const product = await this.productCatalogClient.getProduct(item.productId);
          return {
            ...item,
            productName: product.name,
            imageUrl: product.imageUrl,
            availableStock: product.stock,
          };
        } catch (error) {
          logger.warn('Failed to enrich cart item', { productId: item.productId, error });
          return item; // Return item without enrichment
        }
      })
    );

    return {
      ...cart,
      items: enrichedItems,
    };
  }

  /**
   * Add item to cart with stock validation and compensating transaction
   * Replaces legacy sp_add_cart_item stored procedure
   * @param userId - User ID from Cognito JWT
   * @param dto - Add cart item request
   * @returns Updated cart
   */
  async addItemToCart(userId: string, dto: AddCartItemDTO): Promise<Cart> {
    // Validation
    if (dto.quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0', [
        { field: 'quantity', message: 'must be greater than 0', rejectedValue: dto.quantity },
      ]);
    }

    // Step 1: Validate product exists and has sufficient stock
    let product;
    try {
      product = await this.productCatalogClient.getProduct(dto.productId);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new ProductNotFoundError(`Product ${dto.productId} not found`, dto.productId);
      }
      throw error;
    }

    if (product.stock < dto.quantity) {
      throw new InsufficientStockError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
        product.stock,
        dto.quantity
      );
    }

    // Step 2: Add/update item in cart (DynamoDB upsert)
    let cartItem;
    try {
      cartItem = await this.cartRepository.upsertCartItem(
        userId,
        dto.productId,
        dto.quantity,
        product.price
      );
      logger.info('Item added to cart', { userId, productId: dto.productId, quantity: dto.quantity });
    } catch (error) {
      logger.error('Failed to add item to cart', { userId, dto, error });
      throw error;
    }

    // Step 3: Decrement stock with compensating transaction
    try {
      await this.productCatalogClient.decrementStock(dto.productId, dto.quantity);
      logger.info('Stock decremented successfully', { productId: dto.productId, quantity: dto.quantity });
    } catch (error: any) {
      // Compensating transaction: remove item from cart
      logger.error('Failed to decrement stock, rolling back cart item', {
        userId,
        productId: dto.productId,
        error,
      });
      
      await this.cartRepository.deleteCartItem(userId, dto.productId);
      
      if (error.response?.status === 409) {
        throw new InsufficientStockError(
          'Insufficient stock after cart update',
          undefined,
          dto.quantity
        );
      }
      throw error;
    }

    // Return updated cart
    return await this.getCart(userId);
  }

  /**
   * Update cart item quantity
   * @param userId - User ID
   * @param productId - Product UUID
   * @param dto - Update request
   * @returns Updated cart
   */
  async updateCartItem(userId: string, productId: string, dto: UpdateCartItemDTO): Promise<Cart> {
    // Validation
    if (dto.quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0', [
        { field: 'quantity', message: 'must be greater than 0', rejectedValue: dto.quantity },
      ]);
    }

    // Get current cart item
    const currentItem = await this.cartRepository.getCartItem(userId, productId);
    if (!currentItem) {
      throw new ProductNotFoundError(`Cart item not found`, productId);
    }

    // Validate product exists and has sufficient stock
    const product = await this.productCatalogClient.getProduct(productId);
    
    const quantityDiff = dto.quantity - currentItem.quantity;
    
    if (quantityDiff > 0 && product.stock < quantityDiff) {
      throw new InsufficientStockError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${quantityDiff}`,
        product.stock,
        quantityDiff
      );
    }

    // Update cart item
    const updatedItem = await this.cartRepository.updateCartItem(
      userId,
      productId,
      dto.quantity,
      currentItem.unitPrice
    );

    if (!updatedItem) {
      throw new ProductNotFoundError(`Cart item not found`, productId);
    }

    // Update stock if quantity changed
    if (quantityDiff !== 0) {
      if (quantityDiff > 0) {
        await this.productCatalogClient.decrementStock(productId, quantityDiff);
      } else {
        // Increment stock (return items)
        await this.productCatalogClient.decrementStock(productId, quantityDiff); // Will use negative value
      }
    }

    logger.info('Cart item updated', { userId, productId, newQuantity: dto.quantity });
    return await this.getCart(userId);
  }

  /**
   * Remove item from cart
   * @param userId - User ID
   * @param productId - Product UUID
   */
  async removeCartItem(userId: string, productId: string): Promise<void> {
    const deleted = await this.cartRepository.deleteCartItem(userId, productId);
    
    if (!deleted) {
      throw new ProductNotFoundError(`Cart item not found`, productId);
    }

    logger.info('Cart item removed', { userId, productId });
  }

  /**
   * Clear entire cart
   * @param userId - User ID
   */
  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.clearCart(userId);
    logger.info('Cart cleared', { userId });
  }
}
