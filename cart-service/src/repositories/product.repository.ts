/**
 * Product Repository (Cart Service)
 * 
 * Minimal product repository for cart service to validate products.
 * Only includes read operations needed for cart validation.
 * 
 * Note: This is a cross-service dependency. In production, consider:
 * - Using an API Gateway to call Product Catalog Service
 * - Implementing a product cache with TTL
 * - Using event-driven architecture for product updates
 */

import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from '../config/dynamodb.config';
import { logger } from '../utils/logger.util';

export interface Product {
  productId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export class ProductRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    this.docClient = getDynamoDBClient();
    this.tableName = process.env.PRODUCTS_TABLE_NAME || 'products';
  }

  /**
   * Get product by ID
   * Used for validation when adding items to cart
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      logger.info('Fetching product for cart validation', { productId });

      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          productId,
        },
      });

      const response = await this.docClient.send(command);

      if (!response.Item) {
        logger.warn('Product not found', { productId });
        return null;
      }

      return response.Item as Product;
    } catch (error) {
      logger.error('Error fetching product', { productId, error });
      throw error;
    }
  }
}
