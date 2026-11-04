/**
 * Cart domain model and DTOs
 * Replaces anonymous session_id with OAuth userId
 */

export interface CartItem {
  productId: string; // UUID (sort key)
  productName?: string; // Enriched from Product Catalog Service
  imageUrl?: string; // Enriched from Product Catalog Service
  quantity: number;
  unitPrice: number; // Price at time of adding to cart
  totalPrice: number; // quantity * unitPrice
  availableStock?: number; // Current stock from Product Catalog Service
  addedAt: string; // ISO-8601 timestamp
  updatedAt: string; // ISO-8601 timestamp
}

export interface Cart {
  userId: string; // Partition key (from Cognito JWT)
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
  updatedAt: string;
  expiresAt: number; // TTL (Unix timestamp)
}

export interface AddCartItemDTO {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDTO {
  quantity: number;
}

/**
 * Product info from Product Catalog Service
 */
export interface ProductInfo {
  productId: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
}
