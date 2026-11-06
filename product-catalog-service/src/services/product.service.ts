import { ProductRepository, GetAllProductsParams, GetAllProductsResponse, PaginationResult } from '../repositories/product.repository';
import { Product, ProductValidator, ValidationError, NotFoundError } from '../models/product.model';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Get all products with pagination, filtering, and sorting
   * Implements AC1, AC2, AC3, AC9
   */
  async getAllProducts(params: GetAllProductsParams): Promise<GetAllProductsResponse> {
    // Validate limit (1-100)
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    
    // Validate price range
    if (params.minPrice !== undefined && params.minPrice < 0) {
      throw new ValidationError('minPrice must be >= 0');
    }
    if (params.maxPrice !== undefined && params.maxPrice < 0) {
      throw new ValidationError('maxPrice must be >= 0');
    }
    if (params.minPrice !== undefined && params.maxPrice !== undefined && 
        params.minPrice > params.maxPrice) {
      throw new ValidationError('minPrice cannot be greater than maxPrice');
    }

    // Validate sortBy
    if (params.sortBy && !['price', 'name', 'popularity'].includes(params.sortBy)) {
      throw new ValidationError('sortBy must be one of: price, name, popularity');
    }

    // Validate sortOrder
    if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) {
      throw new ValidationError('sortOrder must be one of: asc, desc');
    }
    
    // Call repository
    return this.repository.getAllProducts(params);
  }

  /**
   * Get product by ID
   * Implements AC4, AC10
   */
  async getProductById(productId: string): Promise<Product> {
    // Validate UUID format
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    if (!ProductValidator.isValidUUID(productId)) {
      throw new ValidationError('Invalid product ID format. Must be a valid UUID');
    }
    
    const product = await this.repository.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} does not exist`);
    }
    
    return product;
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
    // Validate business rules (price > 0, stockQuantity >= 0)
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

    if (!ProductValidator.isValidUUID(productId)) {
      throw new ValidationError('Invalid product ID format. Must be a valid UUID');
    }

    // Validate business rules for updates
    ProductValidator.validate(updates);

    return this.repository.updateProduct(productId, updates);
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    if (!ProductValidator.isValidUUID(productId)) {
      throw new ValidationError('Invalid product ID format. Must be a valid UUID');
    }

    return this.repository.deleteProduct(productId);
  }

  /**
   * Decrement stock for a product (replaces sp_decrement_stock stored procedure)
   * Used during checkout process
   * Note: AC8 states this should be handled by Inventory Service,
   * but kept for backward compatibility
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    if (!productId || productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    if (!ProductValidator.isValidUUID(productId)) {
      throw new ValidationError('Invalid product ID format. Must be a valid UUID');
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

    if (!ProductValidator.isValidUUID(productId)) {
      throw new ValidationError('Invalid product ID format. Must be a valid UUID');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    return this.repository.incrementStock(productId, quantity);
  }
}
