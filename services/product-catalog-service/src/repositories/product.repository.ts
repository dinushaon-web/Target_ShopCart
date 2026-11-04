/**
 * Product Repository - DynamoDB data access layer
 * Replaces legacy ProductDAO.java with JDBC/MySQL
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocumentClient } from '../config/dynamodb';
import { Product, ProductFilters } from '../models/product.model';
import config from '../config';
import logger from '../utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

export class ProductRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = config.dynamodb.productsTable;
  }

  /**
   * Create a new product
   * @param product - Product data without productId
   * @returns Created product with generated UUID
   */
  async create(product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      productId: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: newProduct,
      ConditionExpression: 'attribute_not_exists(productId)',
    });

    try {
      await getDocumentClient().send(command);
      logger.info('Product created', { productId: newProduct.productId });
      return newProduct;
    } catch (error: any) {
      logger.error('Failed to create product', { error, product });
      throw error;
    }
  }

  /**
   * Get product by ID
   * @param productId - UUID of the product
   * @returns Product or null if not found
   */
  async getById(productId: string): Promise<Product | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { productId },
    });

    try {
      const result = await getDocumentClient().send(command);
      
      if (!result.Item) {
        logger.debug('Product not found', { productId });
        return null;
      }

      return result.Item as Product;
    } catch (error: any) {
      logger.error('Failed to get product by ID', { error, productId });
      throw error;
    }
  }

  /**
   * Get all products with filtering and pagination
   * Replaces legacy getAllProducts() with cursor-based pagination
   * @param filters - Filter and pagination options
   * @returns Paginated list of products
   */
  async getAll(filters: ProductFilters): Promise<{ items: Product[]; nextCursor?: string }> {
    const limit = filters.limit || config.pagination.defaultPageSize;
    
    // Build filter expression for active products with stock > 0 (business rule from legacy code)
    let filterExpression = 'isActive = :isActive AND stock > :minStock';
    const expressionAttributeValues: any = {
      ':isActive': true,
      ':minStock': 0,
    };

    // Add category filter
    if (filters.category) {
      filterExpression += ' AND category = :category';
      expressionAttributeValues[':category'] = filters.category;
    }

    // Add price range filters
    if (filters.minPrice !== undefined) {
      filterExpression += ' AND price >= :minPrice';
      expressionAttributeValues[':minPrice'] = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      filterExpression += ' AND price <= :maxPrice';
      expressionAttributeValues[':maxPrice'] = filters.maxPrice;
    }

    // Parse cursor for pagination
    let exclusiveStartKey: any;
    if (filters.cursor) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(filters.cursor, 'base64').toString('utf-8'));
      } catch (error) {
        logger.warn('Invalid cursor provided', { cursor: filters.cursor });
      }
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    try {
      const result = await getDocumentClient().send(command);
      const items = (result.Items || []) as Product[];

      // Sort items in memory (DynamoDB Scan doesn't support sorting)
      if (filters.sortBy) {
        items.sort((a, b) => {
          const aVal = a[filters.sortBy!];
          const bVal = b[filters.sortBy!];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Generate next cursor
      let nextCursor: string | undefined;
      if (result.LastEvaluatedKey) {
        nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      logger.info('Products retrieved', { count: items.length, hasMore: !!nextCursor });
      return { items, nextCursor };
    } catch (error: any) {
      logger.error('Failed to get all products', { error, filters });
      throw error;
    }
  }

  /**
   * Update product
   * @param productId - UUID of the product
   * @param updates - Partial product updates
   * @returns Updated product or null if not found
   */
  async update(productId: string, updates: Partial<Product>): Promise<Product | null> {
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: any = {};
    const expressionAttributeValues: any = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'productId' && key !== 'createdAt' && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    // Always update updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 0) {
      logger.warn('No valid fields to update', { productId });
      return await this.getById(productId);
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(productId)',
      ReturnValues: 'ALL_NEW',
    });

    try {
      const result = await getDocumentClient().send(command);
      logger.info('Product updated', { productId });
      return result.Attributes as Product;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Product not found for update', { productId });
        return null;
      }
      logger.error('Failed to update product', { error, productId, updates });
      throw error;
    }
  }

  /**
   * Soft delete product (set isActive = false)
   * @param productId - UUID of the product
   * @returns true if deleted, false if not found
   */
  async delete(productId: string): Promise<boolean> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':isActive': false,
        ':updatedAt': new Date().toISOString(),
      },
      ConditionExpression: 'attribute_exists(productId)',
    });

    try {
      await getDocumentClient().send(command);
      logger.info('Product soft deleted', { productId });
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Product not found for deletion', { productId });
        return false;
      }
      logger.error('Failed to delete product', { error, productId });
      throw error;
    }
  }

  /**
   * Atomically update stock using DynamoDB conditional writes
   * Replaces legacy sp_decrement_stock stored procedure
   * @param productId - UUID of the product
   * @param operation - increment, decrement, or set
   * @param quantity - Amount to change or new value
   * @returns Updated product with new stock value
   */
  async updateStock(
    productId: string,
    operation: 'increment' | 'decrement' | 'set',
    quantity: number
  ): Promise<{ previousStock: number; currentStock: number; updatedAt: string }> {
    let updateExpression: string;
    let conditionExpression: string | undefined;
    const expressionAttributeValues: any = {
      ':updatedAt': new Date().toISOString(),
    };

    if (operation === 'set') {
      updateExpression = 'SET stock = :quantity, updatedAt = :updatedAt';
      expressionAttributeValues[':quantity'] = quantity;
    } else if (operation === 'increment') {
      updateExpression = 'SET stock = stock + :quantity, updatedAt = :updatedAt';
      expressionAttributeValues[':quantity'] = quantity;
    } else {
      // decrement - must ensure stock doesn't go negative (business rule)
      updateExpression = 'SET stock = stock - :quantity, updatedAt = :updatedAt';
      conditionExpression = 'stock >= :quantity';
      expressionAttributeValues[':quantity'] = quantity;
    }

    // First, get current stock for response
    const currentProduct = await this.getById(productId);
    if (!currentProduct) {
      throw new Error(`Product ${productId} not found`);
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: updateExpression,
      ConditionExpression: conditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    try {
      const result = await getDocumentClient().send(command);
      const updatedProduct = result.Attributes as Product;
      
      logger.info('Stock updated', {
        productId,
        operation,
        quantity,
        previousStock: currentProduct.stock,
        currentStock: updatedProduct.stock,
      });

      return {
        previousStock: currentProduct.stock,
        currentStock: updatedProduct.stock,
        updatedAt: updatedProduct.updatedAt,
      };
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Insufficient stock for decrement', {
          productId,
          requestedQuantity: quantity,
          currentStock: currentProduct.stock,
        });
        throw new Error(
          `Insufficient stock. Current: ${currentProduct.stock}, Requested: ${quantity}`
        );
      }
      logger.error('Failed to update stock', { error, productId, operation, quantity });
      throw error;
    }
  }
}
