/**
 * Product Repository
 * 
 * Data access layer for product operations using DynamoDB
 * Replaces ProductDAO.java with conditional writes instead of stored procedures
 */

import {
  ScanCommand,
  GetCommand,
  UpdateCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDbDocClient, PRODUCTS_TABLE } from '../config/dynamodb.config';
import { Product, ProductDynamoDBItem } from '../models/product.model';
import { NotFoundError, InsufficientStockError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ProductRepository {
  /**
   * Retrieves all products with stock > 0
   * Business rule: filter out-of-stock products
   */
  async getAllProducts(limit: number = 20, lastEvaluatedKey?: Record<string, unknown>): Promise<{
    products: Product[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    try {
      const command = new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: 'stock > :zero AND price > :zero',
        ExpressionAttributeValues: {
          ':zero': 0
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey
      });

      const response = await dynamoDbDocClient.send(command);

      const products = (response.Items || []).map(item => 
        this.mapDynamoDBItemToProduct(item as ProductDynamoDBItem)
      );

      logger.info('Retrieved products', { 
        count: products.length,
        hasMore: !!response.LastEvaluatedKey 
      });

      return {
        products,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      logger.error('Error retrieving products', { error });
      throw error;
    }
  }

  /**
   * Retrieves a single product by ID
   */
  async getProductById(productId: string): Promise<Product> {
    try {
      const command = new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'METADATA'
        }
      });

      const response = await dynamoDbDocClient.send(command);

      if (!response.Item) {
        throw new NotFoundError(`Product with ID '${productId}' does not exist`);
      }

      logger.info('Retrieved product by ID', { productId });

      return this.mapDynamoDBItemToProduct(response.Item as ProductDynamoDBItem);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error retrieving product by ID', { productId, error });
      throw error;
    }
  }

  /**
   * Atomically decrements product stock using DynamoDB conditional writes
   * Replaces sp_decrement_stock stored procedure
   * 
   * Business rules:
   * - Stock must be sufficient (stock >= quantity)
   * - Product must exist
   * - Stock cannot go negative
   */
  async decrementStock(productId: string, quantity: number): Promise<Product> {
    try {
      const command = new UpdateCommand({
        TableName: PRODUCTS_TABLE,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET stock = stock - :qty, updatedAt = :updatedAt',
        ConditionExpression: 'attribute_exists(PK) AND stock >= :qty AND stock > :zero',
        ExpressionAttributeValues: {
          ':qty': quantity,
          ':zero': 0,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      });

      const response = await dynamoDbDocClient.send(command);

      logger.info('Stock decremented successfully', { 
        productId, 
        quantity,
        newStock: response.Attributes?.stock 
      });

      return this.mapDynamoDBItemToProduct(response.Attributes as ProductDynamoDBItem);
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        // Fetch current stock to provide helpful error message
        try {
          const product = await this.getProductById(productId);
          throw new InsufficientStockError(
            `Cannot decrement stock by ${quantity}. Only ${product.stock} units available.`,
            product.stock,
            quantity
          );
        } catch (fetchError) {
          if (fetchError instanceof NotFoundError) {
            throw fetchError;
          }
          throw new InsufficientStockError(
            `Insufficient stock for product ${productId}`,
            undefined,
            quantity
          );
        }
      }
      logger.error('Error decrementing stock', { productId, quantity, error });
      throw error;
    }
  }

  /**
   * Creates a new product (for migration/seeding purposes)
   */
  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const item: ProductDynamoDBItem = {
      PK: `PRODUCT#${id}`,
      SK: 'METADATA',
      id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      createdAt: now,
      updatedAt: now
    };

    try {
      const command = new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)'
      });

      await dynamoDbDocClient.send(command);

      logger.info('Product created', { productId: id });

      return this.mapDynamoDBItemToProduct(item);
    } catch (error) {
      logger.error('Error creating product', { error });
      throw error;
    }
  }

  /**
   * Maps DynamoDB item to Product model
   */
  private mapDynamoDBItemToProduct(item: ProductDynamoDBItem): Product {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      stock: item.stock,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}
