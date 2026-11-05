/**
 * Cart Model
 * 
 * Represents a user's shopping cart
 * Migrated from MySQL session-based to DynamoDB user-based
 */

export interface CartItem {
  productId: string; // UUID
  productName: string;
  quantity: number;
  price: number;
}

export interface Cart {
  userId: string; // OAuth userId from AWS Cognito
  items: CartItem[];
  totalAmount: number; // Calculated server-side
  updatedAt: string; // ISO-8601 timestamp
}

export interface CartDynamoDBItem {
  PK: string; // USER#{userId}
  SK: string; // CART
  userId: string;
  items: CartItem[];
  totalAmount: number;
  updatedAt: string;
}
