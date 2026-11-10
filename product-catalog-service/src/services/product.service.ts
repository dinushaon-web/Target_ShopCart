import { ProductRepository, PaginationResult } from '../repositories/product.repository';
import { 
  Product, 
  ProductValidator, 
  ValidationError, 
  ProductListQueryParams,
  ProductListResponse,
  VALID_CATEGORIES,
  VALID_SORT_FIELDS
} from '../models/product.model';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Get all products with advanced filtering, sorting, and pagination
   * New method supporting query parameters
   */
  async getAllProducts(
    queryParams: ProductListQueryParams
  ): Promise<ProductListResponse> {
    // Validate and sanitize query parameters
    const validatedParams = this.validateQueryParams(queryParams);

    // Decode nextToken if provided
    let lastEvaluatedKey: Record<string, any> | undefined;
    if (validatedParams.nextToken) {
      try {
        lastEvaluatedKey = JSON.parse(
          Buffer.from(validatedParams.nextToken, 'base64').toString('utf-8')
        );
      } catch (error) {
        throw new ValidationError('Invalid pagination token');
      }
    }

    // Query products
    const result = await this.repository.queryProducts(
      validatedParams,
      lastEvaluatedKey
    );

    // Encode nextToken
    const nextToken = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      products: result.items,
      pagination: {
        limit: validatedParams.limit || 20,
        nextToken,
        hasMore: !!result.lastEvaluatedKey
      }
    };
  }

  /**
   * Comprehensive query parameter validation
   */
  private validateQueryParams(params: ProductListQueryParams): ProductListQueryParams {
    const validated: ProductListQueryParams = {};

    // Validate limit (1-100, default 20)
    if (params.limit !== undefined) {
      const limit = typeof params.limit === 'string' ? parseInt(params.limit) : params.limit;
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      validated.limit = limit;
    } else {
      validated.limit = 20;
    }

    // Validate category enum
    if (params.category) {
      if (!VALID_CATEGORIES.includes(params.category as any)) {
        throw new ValidationError(
          `Invalid category. Valid categories: ${VALID_CATEGORIES.join(', ')}`
        );
      }
      validated.category = params.category;
    }

    // Validate price range
    if (params.minPrice !== undefined) {
      const minPrice = typeof params.minPrice === 'string' ? parseFloat(params.minPrice) : params.minPrice;
      if (isNaN(minPrice) || minPrice < 0) {
        throw new ValidationError('minPrice must be a valid number >= 0');
      }
      validated.minPrice = minPrice;
    }

    if (params.maxPrice !== undefined) {
      const maxPrice = typeof params.maxPrice === 'string' ? parseFloat(params.maxPrice) : params.maxPrice;
      if (isNaN(maxPrice) || maxPrice < 0) {
        throw new ValidationError('maxPrice must be a valid number >= 0');
      }
      validated.maxPrice = maxPrice;
    }

    // Validate price range logic
    if (validated.minPrice !== undefined && validated.maxPrice !== undefined) {
      if (validated.minPrice > validated.maxPrice) {
        throw new ValidationError('minPrice cannot be greater than maxPrice');
      }
    }

    // Validate inStock boolean
    if (params.inStock !== undefined) {
      if (typeof params.inStock === 'string') {
        validated.inStock = params.inStock === 'true';
      } else {
        validated.inStock = params.inStock;
      }
    }

    // Validate sortBy
    if (params.sortBy) {
      if (!VALID_SORT_FIELDS.includes(params.sortBy as any)) {
        throw new ValidationError(
          `Invalid sortBy field. Valid fields: ${VALID_SORT_FIELDS.join(', ')}`
        );
      }
      validated.sortBy = params.sortBy;
    } else {
      validated.sortBy = 'createdAt';
    }

    // Validate order
    if (params.order) {
      if (params.order !== 'asc' && params.order !== 'desc') {
        throw new ValidationError('Order must be either "asc" or "desc"');
      }
      validated.order = params.order;
    } else {
      validated.order = 'desc';
    }

    // Pass through nextToken (validated during decoding)
    if (params.nextToken) {
      validated.nextToken = params.nextToken;
    }

    return validated;
  }

  /**
   * Get products with legacy pagination (deprecated)
   * Use getAllProducts() with query parameters instead
   */
  async getAllProductsLegacy(
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
    if (!VALID_CATEGORIES.includes(category as any)) {
      throw new ValidationError(
        `Invalid category. Valid categories: ${VALID_CATEGORIES.join(', ')}`
      );
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
