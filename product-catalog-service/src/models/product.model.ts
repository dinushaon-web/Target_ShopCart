import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Product interface with new fields:
 * - currency: ISO 4217 currency code (default: "USD")
 * - imageUrl: URL to product image (nullable)
 * - inStock: Computed field (stockQuantity > 0)
 * - stockQuantity: Renamed from "stock" for clarity
 * - category: Now required (was optional)
 */
export interface Product {
  productId: string;          // UUID - replaces INT AUTO_INCREMENT
  name: string;
  description: string;
  price: number;              // Must be > 0 (business rule)
  currency: string;           // ISO 4217 currency code (default: "USD")
  category: string;           // Required for GSI queries
  imageUrl: string | null;    // URL to product image (nullable)
  inStock: boolean;           // Computed: stockQuantity > 0
  stockQuantity: number;      // Renamed from "stock", must be >= 0
  createdAt: string;          // ISO 8601 timestamp
  updatedAt: string;          // ISO 8601 timestamp
}

/**
 * Query parameters for product listing endpoint
 * Supports filtering, sorting, and pagination
 */
export interface ProductListQueryParams {
  limit?: number;             // Default: 20, Max: 100
  nextToken?: string;         // Base64-encoded cursor
  category?: string;          // Filter by category
  minPrice?: number;          // Minimum price (inclusive)
  maxPrice?: number;          // Maximum price (inclusive)
  inStock?: boolean;          // Filter in-stock products only
  sortBy?: string;            // Field to sort by (name, price, createdAt)
  order?: 'asc' | 'desc';     // Sort order
}

/**
 * Response envelope for product list endpoint
 * New format: { products: [], pagination: {} }
 * Replaces old format: { data: [], pagination: {} }
 */
export interface ProductListResponse {
  products: Product[];
  pagination: {
    limit: number;
    nextToken?: string;
    hasMore: boolean;
  };
}

/**
 * Valid product categories
 */
export const VALID_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'General'
] as const;

export type ProductCategory = typeof VALID_CATEGORIES[number];

/**
 * Valid sort fields
 */
export const VALID_SORT_FIELDS = ['name', 'price', 'createdAt'] as const;
export type SortField = typeof VALID_SORT_FIELDS[number];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

export class ProductValidator {
  static validate(product: Partial<Product>): void {
    if (product.price !== undefined && product.price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }
    if (product.stockQuantity !== undefined && product.stockQuantity < 0) {
      throw new ValidationError('Stock quantity cannot be negative');
    }
    if (product.name !== undefined && product.name.trim().length === 0) {
      throw new ValidationError('Product name cannot be empty');
    }
    if (product.category !== undefined && !VALID_CATEGORIES.includes(product.category as ProductCategory)) {
      throw new ValidationError(
        `Invalid category. Valid categories: ${VALID_CATEGORIES.join(', ')}`
      );
    }
    if (product.currency !== undefined && !/^[A-Z]{3}$/.test(product.currency)) {
      throw new ValidationError('Currency must be a valid ISO 4217 code (e.g., USD, EUR)');
    }
  }

  static createProduct(data: Omit<Product, 'productId' | 'createdAt' | 'updatedAt' | 'inStock'>): Product {
    // Set defaults
    const productData = {
      ...data,
      currency: data.currency || 'USD',
      category: data.category || 'General',
      imageUrl: data.imageUrl || null
    };

    this.validate(productData);
    
    const now = new Date().toISOString();
    return {
      ...productData,
      productId: uuidv4(),
      inStock: productData.stockQuantity > 0,
      createdAt: now,
      updatedAt: now
    };
  }
}

/**
 * Transform legacy product format to new format
 * Handles backward compatibility during migration
 */
export function transformLegacyProduct(legacy: any): Product {
  return {
    productId: legacy.productId,
    name: legacy.name,
    description: legacy.description,
    price: legacy.price,
    currency: legacy.currency || 'USD',
    category: legacy.category || 'General',
    imageUrl: legacy.imageUrl || null,
    inStock: (legacy.stock || legacy.stockQuantity || 0) > 0,
    stockQuantity: legacy.stock || legacy.stockQuantity || 0,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt
  };
}
