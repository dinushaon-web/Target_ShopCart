import { v4 as uuidv4 } from 'uuid';

/**
 * Product model for DynamoDB
 * Updated to include new fields: currency, imageUrl, inStock, stockQuantity, popularity
 * Renamed: stock -> stockQuantity
 */
export interface Product {
  productId: string;        // UUID - replaces INT AUTO_INCREMENT
  name: string;
  description: string;
  price: number;            // Must be > 0 (business rule)
  currency: string;         // ISO 4217 currency code (e.g., "USD")
  category: string;         // Required for GSI queries (removed optional)
  imageUrl: string;         // Fully qualified URL to product image
  inStock: boolean;         // Derived from stockQuantity > 0
  stockQuantity: number;    // Renamed from 'stock', must be >= 0
  popularity?: number;      // Optional popularity score for sorting
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
}

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

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
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
    if (product.currency !== undefined && !/^[A-Z]{3}$/.test(product.currency)) {
      throw new ValidationError('Currency must be a valid ISO 4217 code (e.g., USD)');
    }
    if (product.imageUrl !== undefined && !product.imageUrl.startsWith('https://')) {
      throw new ValidationError('Image URL must be a valid HTTPS URL');
    }
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
  }

  static createProduct(data: Omit<Product, 'productId' | 'createdAt' | 'updatedAt' | 'inStock'>): Product {
    this.validate(data);
    const now = new Date().toISOString();
    return {
      ...data,
      productId: uuidv4(),
      inStock: data.stockQuantity > 0,
      popularity: data.popularity || 0,
      createdAt: now,
      updatedAt: now
    };
  }
}
