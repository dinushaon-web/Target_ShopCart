import { v4 as uuidv4 } from 'uuid';

export interface Product {
  productId: string;        // UUID - replaces INT AUTO_INCREMENT
  name: string;
  description: string;
  price: number;            // Must be > 0 (business rule)
  stock: number;            // Must be >= 0
  category?: string;        // For GSI queries
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

export class ProductValidator {
  static validate(product: Partial<Product>): void {
    if (product.price !== undefined && product.price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }
    if (product.stock !== undefined && product.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }
    if (product.name !== undefined && product.name.trim().length === 0) {
      throw new ValidationError('Product name cannot be empty');
    }
  }

  static createProduct(data: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>): Product {
    this.validate(data);
    const now = new Date().toISOString();
    return {
      ...data,
      productId: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
  }
}
