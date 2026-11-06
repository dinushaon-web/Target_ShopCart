import { ProductRepository, PaginationResult } from '../repositories/product.repository';
import { Product, ProductValidator, ValidationError } from '../models/product.model';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async getAllProducts(
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<PaginationResult<Product>> {
    return this.repository.getAllProducts(limit, lastEvaluatedKey);
  }

  async getProductById(productId: string): Promise<Product | null> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }
    return this.repository.getProductById(productId);
  }

  async getProductsByCategory(
    category: string,
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<PaginationResult<Product>> {
    if (!category || category.trim().length === 0) {
      throw new ValidationError('Category is required');
    }
    return this.repository.getProductsByCategory(category, limit, lastEvaluatedKey);
  }

  async createProduct(
    productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    // Validate business rules (price > 0, stock >= 0)
    ProductValidator.validate(productData);
    return this.repository.createProduct(productData);
  }

  async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, 'productId' | 'createdAt'>>
  ): Promise<Product> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    // Validate business rules for updates
    ProductValidator.validate(updates);

    return this.repository.updateProduct(productId, updates);
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }
    return this.repository.deleteProduct(productId);
  }

  /**
   * Decrement stock for a product (replaces sp_decrement_stock stored procedure)
   * Used during checkout process
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    return this.repository.decrementStock(productId, quantity);
  }

  /**
   * Increment stock for a product (for returns or restocking)
   */
  async incrementStock(productId: string, quantity: number): Promise<void> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    return this.repository.incrementStock(productId, quantity);
  }
}
