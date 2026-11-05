/**
 * Cart Repository
 * 
 * Data access layer for cart operations using DynamoDB
 * Replaces CartDAO.java and sp_add_cart_item stored procedure
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoDbDocClient, CARTS_TABLE } from '../config/dynamodb.config';
import { Cart, CartItem, CartDynamoDBItem } from '../models/cart.model';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class CartRepository {
  /**
   * Retrieves a cart by userId
   * Returns empty cart if not found
   */
  async getCartByUserId(userId: string): Promise<Cart> {
    try {
      const command = new GetCommand({
        TableName: CARTS_TABLE,
        Key: {
          PK: `USER#${userId}`,
          SK: 'CART'
        }
      });

      const response = await dynamoDbDocClient.send(command);

      if (!response.Item) {
        // Return empty cart if not found
        logger.info('Cart not found, returning empty cart', { userId });
        return {
          userId,
          items: [],
          totalAmount: 0,
          updatedAt: new Date().toISOString()
        };
      }

      logger.info('Retrieved cart', { userId, itemCount: response.Item.items?.length || 0 });

      return this.mapDynamoDBItemToCart(response.Item as CartDynamoDBItem);
    } catch (error) {
      logger.error('Error retrieving cart', { userId, error });
      throw error;
    }
  }

  /**
   * Saves or updates a cart
   * Replaces sp_add_cart_item stored procedure logic
   */
  async saveCart(cart: Cart): Promise<Cart> {
    const item: CartDynamoDBItem = {
      PK: `USER#${cart.userId}`,
      SK: 'CART',
      userId: cart.userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
      updatedAt: new Date().toISOString()
    };

    try {
      const command = new PutCommand({
        TableName: CARTS_TABLE,
        Item: item
      });

      await dynamoDbDocClient.send(command);

      logger.info('Cart saved', { 
        userId: cart.userId, 
        itemCount: cart.items.length,
        totalAmount: cart.totalAmount 
      });

      return this.mapDynamoDBItemToCart(item);
    } catch (error) {
      logger.error('Error saving cart', { userId: cart.userId, error });
      throw error;
    }
  }

  /**
   * Adds or updates an item in the cart
   * Business logic: if item exists, increment quantity; otherwise add new item
   */
  async addOrUpdateCartItem(
    userId: string,
    productId: string,
    productName: string,
    quantity: number,
    price: number
  ): Promise<Cart> {
    const cart = await this.getCartByUserId(userId);

    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
      logger.info('Updated existing cart item', { 
        userId, 
        productId, 
        newQuantity: cart.items[existingItemIndex].quantity 
      });
    } else {
      // Add new item
      cart.items.push({ productId, productName, quantity, price });
      logger.info('Added new cart item', { userId, productId, quantity });
    }

    // Recalculate total amount server-side
    cart.totalAmount = this.calculateTotalAmount(cart.items);

    return await this.saveCart(cart);
  }

  /**
   * Updates the quantity of a cart item
   * If quantity is 0, removes the item
   */
  async updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getCartByUserId(userId);

    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex < 0) {
      throw new NotFoundError(
        `The product with ID '${productId}' does not exist in the cart`
      );
    }

    if (quantity === 0) {
      // Remove item
      cart.items.splice(existingItemIndex, 1);
      logger.info('Removed cart item', { userId, productId });
    } else {
      // Update quantity
      cart.items[existingItemIndex].quantity = quantity;
      logger.info('Updated cart item quantity', { userId, productId, quantity });
    }

    // Recalculate total amount
    cart.totalAmount = this.calculateTotalAmount(cart.items);

    return await this.saveCart(cart);
  }

  /**
   * Removes an item from the cart
   */
  async removeCartItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCartByUserId(userId);

    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex < 0) {
      throw new NotFoundError(
        `The product with ID '${productId}' does not exist in the cart`
      );
    }

    cart.items.splice(existingItemIndex, 1);
    logger.info('Removed cart item', { userId, productId });

    // Recalculate total amount
    cart.totalAmount = this.calculateTotalAmount(cart.items);

    return await this.saveCart(cart);
  }

  /**
   * Calculates total amount from cart items
   * Business rule: always calculate server-side, never trust client
   */
  private calculateTotalAmount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Maps DynamoDB item to Cart model
   */
  private mapDynamoDBItemToCart(item: CartDynamoDBItem): Cart {
    return {
      userId: item.userId,
      items: item.items || [],
      totalAmount: item.totalAmount,
      updatedAt: item.updatedAt
    };
  }
}
