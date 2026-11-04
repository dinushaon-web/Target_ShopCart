/**
 * Product domain model and DTOs
 * Replaces legacy Product.java with UUID-based identifiers
 */

export interface Product {
  productId: string; // UUID v4 (replaces INT AUTO_INCREMENT)
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string; // ISO-8601 timestamp
  updatedAt: string; // ISO-8601 timestamp
}

export enum ProductCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  BOOKS = 'books',
  HOME = 'home',
  SPORTS = 'sports',
  TOYS = 'toys',
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: ProductCategory;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductFilters {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
}

export interface StockUpdateRequest {
  operation: 'increment' | 'decrement' | 'set';
  quantity: number;
}

export interface StockUpdateResponse {
  productId: string;
  previousStock: number;
  currentStock: number;
  updatedAt: string;
}
