/**
 * Product Service - Business logic layer
 * Implements business rules from legacy ProductServlet and ProductDAO
 */

import { ProductRepository } from '../repositories/product.repository';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilters,
  StockUpdateRequest,
  StockUpdateResponse,
} from '../models/product.model';
import { ProductNotFoundError, InsufficientStockError, ValidationError } from '../middleware/error.middleware';
import logger from '../utils/logger.util';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  /**
   * Create a new product with business rule validation
   * Business rule: price must be > 0 (from legacy ProductServlet)
   * @param dto - Product creation data
   * @returns Created product
   */
  async createProduct(dto: CreateProductDTO): Promise<Product> {
    // Business rule validation
    if (dto.price <= 0) {
      throw new ValidationError('Product price must be greater than 0', [
        { field: 'price', message: 'must be greater than 0', rejectedValue: dto.price },
      ]);
    }

    if (dto.stock < 0) {
      throw new ValidationError('Product stock cannot be negative', [
        { field: 'stock', message: 'must be greater than or equal to 0', rejectedValue: dto.stock },
      ]);
    }

    const product = await this.productRepository.create({
      ...dto,
      isActive: true,
    });

    logger.info('Product created successfully', { productId: product.productId });
    return product;
  }

  /**
   * Get product by ID
   * @param productId - UUID of the product
   * @returns Product
   * @throws ProductNotFoundError if product doesn't exist
   */
  async getProductById(productId: string): Promise<Product> {
    const product = await this.productRepository.getById(productId);
    
    if (!product) {
      throw new ProductNotFoundError(`Product with ID '${productId}' not found`, productId);
    }

    return product;
  }

  /**
   * Get all products with filtering and pagination
   * Implements business rule: filter out-of-stock products (from legacy ProductDAO)
   * @param filters - Filter and pagination options
   * @returns Paginated list of products
   */
  async getAllProducts(filters: ProductFilters): Promise<{ items: Product[]; nextCursor?: string }> {
    const result = await this.productRepository.getAll(filters);
    
    logger.info('Products retrieved', {
      count: result.items.length,
      hasMore: !!result.nextCursor,
      filters,
    });

    return result;
  }

  /**
   * Update product with business rule validation
   * @param productId - UUID of the product
   * @param dto - Product update data
   * @returns Updated product
   * @throws ProductNotFoundError if product doesn't exist
   */
  async updateProduct(productId: string, dto: UpdateProductDTO): Promise<Product> {
    // Validate product exists
    const existingProduct = await this.getProductById(productId);

    // Business rule validation
    if (dto.price !== undefined && dto.price <= 0) {
      throw new ValidationError('Product price must be greater than 0', [
        { field: 'price', message: 'must be greater than 0', rejectedValue: dto.price },
      ]);
    }

    if (dto.stock !== undefined && dto.stock < 0) {
      throw new ValidationError('Product stock cannot be negative', [
        { field: 'stock', message: 'must be greater than or equal to 0', rejectedValue: dto.stock },
      ]);
    }

    const updatedProduct = await this.productRepository.update(productId, dto);
    
    if (!updatedProduct) {
      throw new ProductNotFoundError(`Product with ID '${productId}' not found`, productId);
    }

    logger.info('Product updated successfully', { productId });
    return updatedProduct;
  }

  /**
   * Soft delete product
   * @param productId - UUID of the product
   * @throws ProductNotFoundError if product doesn't exist
   */
  async deleteProduct(productId: string): Promise<void> {
    const deleted = await this.productRepository.delete(productId);
    
    if (!deleted) {
      throw new ProductNotFoundError(`Product with ID '${productId}' not found`, productId);
    }

    logger.info('Product deleted successfully', { productId });
  }

  /**
   * Update product stock atomically
   * Replaces legacy sp_decrement_stock stored procedure with DynamoDB conditional writes
   * @param productId - UUID of the product
   * @param request - Stock update request
   * @returns Stock update response
   * @throws ProductNotFoundError if product doesn't exist
   * @throws InsufficientStockError if decrement would result in negative stock
   */
  async updateStock(productId: string, request: StockUpdateRequest): Promise<StockUpdateResponse> {
    // Validate product exists
    await this.getProductById(productId);

    try {
      const result = await this.productRepository.updateStock(
        productId,
        request.operation,
        request.quantity
      );

      logger.info('Stock updated successfully', {
        productId,
        operation: request.operation,
        quantity: request.quantity,
        previousStock: result.previousStock,
        currentStock: result.currentStock,
      });

      return {
        productId,
        ...result,
      };
    } catch (error: any) {
      if (error.message.includes('Insufficient stock')) {
        throw new InsufficientStockError(
          error.message,
          undefined,
          request.quantity
        );
      }
      throw error;
    }
  }

  /**
   * Decrement stock (convenience method for cart service)
   * Replaces legacy ProductDAO.decrementStock()
   * @param productId - UUID of the product
   * @param quantity - Quantity to decrement
   * @throws InsufficientStockError if insufficient stock
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    await this.updateStock(productId, {
      operation: 'decrement',
      quantity,
    });
  }
}
