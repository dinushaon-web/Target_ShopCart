/**
 * Product Model
 * 
 * Represents a product in the catalog with UUID-based identification.
 * Migrated from MySQL INT AUTO_INCREMENT to UUID strings.
 */

export interface Product {
  id: string; // UUID v4
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string; // ISO-8601 timestamp
  updatedAt: string; // ISO-8601 timestamp
}

export interface ProductDynamoDBItem {
  PK: string; // PRODUCT#{uuid}
  SK: string; // METADATA
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
