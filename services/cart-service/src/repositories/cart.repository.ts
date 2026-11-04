/**
 * Cart Repository - DynamoDB data access layer
 * Replaces legacy CartDAO.java with session_id-based carts
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocumentClient } from '../config/dynamodb';
import { Cart, CartItem } from '../models/cart.model';
import config from '../config';
import logger from '../utils/logger.util';

export class CartRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = config.dynamodb.cartsTable;
  }

  /**
   * Get user's cart with all items
   * @param userId - User ID from Cognito JWT
   * @returns Cart with items or null if empty
   */
  async getCart(userId: string): Promise<Cart | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    try {
      const result = await getDocumentClient().send(command);
      
      if (!result.Items || result.Items.length === 0) {
        logger.debug('Cart is empty', { userId });
        return null;
      }

      const items = result.Items as CartItem[];
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const latestUpdate = items.reduce((latest, item) => 
        item.updatedAt > latest ? item.updatedAt : latest, 
        items[0].updatedAt
      );

      const cart: Cart = {
        userId,
        items,
        totalAmount,
        itemCount,
        updatedAt: latestUpdate,
        expiresAt: Math.floor(Date.now() / 1000) + config.cart.ttlSeconds,
      };

      logger.info('Cart retrieved', { userId, itemCount: items.length });
      return cart;
    } catch (error: any) {
      logger.error('Failed to get cart', { error, userId });
      throw error;
    }
  }

  /**
   * Add or update item in cart (upsert)
   * Replaces legacy sp_add_cart_item stored procedure
   * @param userId - User ID from Cognito JWT
   * @param productId - UUID of the product
   * @param quantity - Quantity to add
   * @param unitPrice - Price at time of adding
   * @returns Updated cart item
   */
  async upsertCartItem(
    userId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<CartItem> {
    const now = new Date().toISOString();
    const expiresAt = Math.floor(Date.now() / 1000) + config.cart.ttlSeconds;

    // Check if item already exists
    const existingItem = await this.getCartItem(userId, productId);

    if (existingItem) {
      // Update existing item - increment quantity
      const newQuantity = existingItem.quantity + quantity;
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId, productId },
        UpdateExpression: 'SET quantity = :quantity, totalPrice = :totalPrice, updatedAt = :updatedAt, expiresAt = :expiresAt',
        ExpressionAttributeValues: {
          ':quantity': newQuantity,
          ':totalPrice': newQuantity * unitPrice,
          ':updatedAt': now,
          ':expiresAt': expiresAt,
        },
        ReturnValues: 'ALL_NEW',
      });

      const result = await getDocumentClient().send(command);
      logger.info('Cart item updated', { userId, productId, newQuantity });
      return result.Attributes as CartItem;
    } else {
      // Create new item
      const newItem: CartItem = {
        productId,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        addedAt: now,
        updatedAt: now,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          userId,
          ...newItem,
          expiresAt,
        },
      });

      await getDocumentClient().send(command);
      logger.info('Cart item added', { userId, productId, quantity });
      return newItem;
    }
  }

  /**
   * Get specific cart item
   * @param userId - User ID
   * @param productId - Product UUID
   * @returns Cart item or null
   */
  async getCartItem(userId: string, productId: string): Promise<CartItem | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { userId, productId },
    });

    try {
      const result = await getDocumentClient().send(command);
      return result.Item ? (result.Item as CartItem) : null;
    } catch (error: any) {
      logger.error('Failed to get cart item', { error, userId, productId });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * @param userId - User ID
   * @param productId - Product UUID
   * @param quantity - New quantity
   * @param unitPrice - Unit price
   * @returns Updated cart item or null if not found
   */
  async updateCartItem(
    userId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<CartItem | null> {
    const now = new Date().toISOString();
    const expiresAt = Math.floor(Date.now() / 1000) + config.cart.ttlSeconds;

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { userId, productId },
      UpdateExpression: 'SET quantity = :quantity, totalPrice = :totalPrice, updatedAt = :updatedAt, expiresAt = :expiresAt',
      ExpressionAttributeValues: {
        ':quantity': quantity,
        ':totalPrice': quantity * unitPrice,
        ':updatedAt': now,
        ':expiresAt': expiresAt,
      },
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(productId)',
      ReturnValues: 'ALL_NEW',
    });

    try {
      const result = await getDocumentClient().send(command);
      logger.info('Cart item quantity updated', { userId, productId, quantity });
      return result.Attributes as CartItem;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Cart item not found for update', { userId, productId });
        return null;
      }
      logger.error('Failed to update cart item', { error, userId, productId });
      throw error;
    }
  }

  /**
   * Delete cart item
   * @param userId - User ID
   * @param productId - Product UUID
   * @returns true if deleted, false if not found
   */
  async deleteCartItem(userId: string, productId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { userId, productId },
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(productId)',
    });

    try {
      await getDocumentClient().send(command);
      logger.info('Cart item deleted', { userId, productId });
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Cart item not found for deletion', { userId, productId });
        return false;
      }
      logger.error('Failed to delete cart item', { error, userId, productId });
      throw error;
    }
  }

  /**
   * Clear entire cart for user
   * @param userId - User ID
   */
  async clearCart(userId: string): Promise<void> {
    // First get all items
    const cart = await this.getCart(userId);
    
    if (!cart || cart.items.length === 0) {
      logger.debug('Cart already empty', { userId });
      return;
    }

    // Delete each item
    const deletePromises = cart.items.map((item) =>
      this.deleteCartItem(userId, item.productId)
    );

    await Promise.all(deletePromises);
    logger.info('Cart cleared', { userId, itemsDeleted: cart.items.length });
  }
}
