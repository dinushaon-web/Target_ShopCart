/**
 * Product Service
 * 
 * Business logic layer for product operations
 * Enforces business rules and validation
 */

import { ProductRepository } from '../repositories/product.repository';
import { Product } from '../models/product.model';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  /**
   * Retrieves all products with pagination
   * Business rule: Only return products with stock > 0 and price > 0
   */
  async getAllProducts(limit: number = 20, cursor?: string): Promise<{
    products: Product[];
    cursor: string | null;
  }> {
    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new ValidationError("The 'limit' parameter must be between 1 and 100");
    }

    let lastEvaluatedKey: Record<string, unknown> | undefined;

    // Decode cursor if provided
    if (cursor) {
      try {
        lastEvaluatedKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      } catch (error) {
        throw new ValidationError('Invalid cursor format');
      }
    }

    const result = await this.productRepository.getAllProducts(limit, lastEvaluatedKey);

    // Encode next cursor
    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    logger.info('Products retrieved', { 
      count: result.products.length,
      hasNextPage: !!nextCursor 
    });

    return {
      products: result.products,
      cursor: nextCursor
    };
  }

  /**
   * Retrieves a single product by ID
   */
  async getProductById(productId: string): Promise<Product> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new ValidationError('The productId must be a valid UUID format');
    }

    const product = await this.productRepository.getProductById(productId);

    // Business rule: price must be > 0
    if (product.price <= 0) {
      throw new ValidationError(`Product ${productId} has invalid price`);
    }

    return product;
  }

  /**
   * Decrements product stock atomically
   * Business rules:
   * - Quantity must be > 0
   * - Stock must be sufficient
   * - Price must be > 0
   */
  async decrementStock(productId: string, quantity: number): Promise<Product> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new ValidationError('The productId must be a valid UUID format');
    }

    // Validate quantity
    if (quantity <= 0) {
      throw new ValidationError("The 'quantity' field must be greater than 0");
    }

    const product = await this.productRepository.decrementStock(productId, quantity);

    // Business rule: price must be > 0 (validated after decrement)
    if (product.price <= 0) {
      throw new ValidationError(`Product ${productId} has invalid price`);
    }

    logger.info('Stock decremented via service', { productId, quantity });

    return product;
  }
}
