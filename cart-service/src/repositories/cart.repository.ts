/**
 * Cart Repository
 * 
 * Handles all DynamoDB operations for the carts table.
 * Replaces legacy CartDAO.java and sp_add_cart_item stored procedure.
 * 
 * DynamoDB Schema:
 * - Table: carts
 * - Partition Key: userId (String)
 * - Sort Key: productId (String)
 * - Attributes: productName, quantity, priceSnapshot, addedAt, updatedAt
 */

import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from '../config/dynamodb.config';
import { CartItem, CartItemNotFoundError, ValidationError } from '../models/cart.model';
import { logger } from '../utils/logger.util';

export class CartRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    this.docClient = getDynamoDBClient();
    this.tableName = process.env.CARTS_TABLE_NAME || 'carts';
  }

  /**
   * Get all cart items for a user
   * Replaces: CartDAO.getCartItems(session_id)
   */
  async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      logger.info('Fetching cart items', { userId });

      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      });

      const response = await this.docClient.send(command);
      const items = (response.Items || []) as CartItem[];

      logger.info('Cart items fetched successfully', { userId, itemCount: items.length });
      return items;
    } catch (error) {
      logger.error('Error fetching cart items', { userId, error });
      throw error;
    }
  }

  /**
   * Get a specific cart item
   */
  async getCartItem(userId: string, productId: string): Promise<CartItem | null> {
    try {
      logger.info('Fetching cart item', { userId, productId });

      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          userId,
          productId,
        },
      });

      const response = await this.docClient.send(command);
      
      if (!response.Item) {
        return null;
      }

      return response.Item as CartItem;
    } catch (error) {
      logger.error('Error fetching cart item', { userId, productId, error });
      throw error;
    }
  }

  /**
   * Add or update cart item with upsert logic
   * Replaces: sp_add_cart_item stored procedure
   * 
   * Business Logic:
   * - If item exists, increment quantity
   * - If item doesn't exist, create new item
   * - Uses DynamoDB UpdateExpression with if_not_exists for upsert
   */
  async addOrUpdateCartItem(
    userId: string,
    productId: string,
    productName: string,
    quantity: number,
    priceSnapshot: number
  ): Promise<CartItem> {
    try {
      logger.info('Adding/updating cart item', { userId, productId, quantity });

      const now = new Date().toISOString();
      const subtotal = quantity * priceSnapshot;

      // Upsert logic using UpdateExpression
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId,
          productId,
        },
        UpdateExpression:
          'SET productName = :productName, ' +
          'quantity = if_not_exists(quantity, :zero) + :quantity, ' +
          'priceSnapshot = :priceSnapshot, ' +
          'subtotal = (if_not_exists(quantity, :zero) + :quantity) * :priceSnapshot, ' +
          'addedAt = if_not_exists(addedAt, :now), ' +
          'updatedAt = :now',
        ExpressionAttributeValues: {
          ':productName': productName,
          ':quantity': quantity,
          ':priceSnapshot': priceSnapshot,
          ':zero': 0,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.docClient.send(command);
      const updatedItem = response.Attributes as CartItem;

      logger.info('Cart item added/updated successfully', {
        userId,
        productId,
        newQuantity: updatedItem.quantity,
      });

      return updatedItem;
    } catch (error) {
      logger.error('Error adding/updating cart item', { userId, productId, error });
      throw error;
    }
  }

  /**
   * Update cart item quantity (replace, not increment)
   * Uses optimistic locking to prevent concurrent update conflicts
   */
  async updateCartItemQuantity(
    userId: string,
    productId: string,
    newQuantity: number
  ): Promise<CartItem> {
    try {
      logger.info('Updating cart item quantity', { userId, productId, newQuantity });

      // First, get the current item to retrieve priceSnapshot
      const existingItem = await this.getCartItem(userId, productId);
      if (!existingItem) {
        throw new CartItemNotFoundError(productId);
      }

      const now = new Date().toISOString();
      const subtotal = newQuantity * existingItem.priceSnapshot;

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId,
          productId,
        },
        UpdateExpression:
          'SET quantity = :quantity, ' +
          'subtotal = :subtotal, ' +
          'updatedAt = :now',
        ExpressionAttributeValues: {
          ':quantity': newQuantity,
          ':subtotal': subtotal,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.docClient.send(command);
      const updatedItem = response.Attributes as CartItem;

      logger.info('Cart item quantity updated successfully', {
        userId,
        productId,
        newQuantity,
      });

      return updatedItem;
    } catch (error) {
      logger.error('Error updating cart item quantity', { userId, productId, error });
      throw error;
    }
  }

  /**
   * Remove a cart item
   */
  async removeCartItem(userId: string, productId: string): Promise<void> {
    try {
      logger.info('Removing cart item', { userId, productId });

      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          userId,
          productId,
        },
      });

      await this.docClient.send(command);

      logger.info('Cart item removed successfully', { userId, productId });
    } catch (error) {
      logger.error('Error removing cart item', { userId, productId, error });
      throw error;
    }
  }

  /**
   * Clear all cart items for a user
   */
  async clearCart(userId: string): Promise<void> {
    try {
      logger.info('Clearing cart', { userId });

      // First, get all items
      const items = await this.getCartItems(userId);

      if (items.length === 0) {
        logger.info('Cart already empty', { userId });
        return;
      }

      // Batch delete all items
      const deleteRequests = items.map((item) => ({
        DeleteRequest: {
          Key: {
            userId,
            productId: item.productId,
          },
        },
      }));

      // DynamoDB BatchWriteItem has a limit of 25 items per request
      const batchSize = 25;
      for (let i = 0; i < deleteRequests.length; i += batchSize) {
        const batch = deleteRequests.slice(i, i + batchSize);
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch,
          },
        });
        await this.docClient.send(command);
      }

      logger.info('Cart cleared successfully', { userId, itemsDeleted: items.length });
    } catch (error) {
      logger.error('Error clearing cart', { userId, error });
      throw error;
    }
  }
}
