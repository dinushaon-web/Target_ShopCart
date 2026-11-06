/**
 * Cart Domain Model
 * 
 * Represents a shopping cart with items for a specific user.
 * Replaces legacy CartServlet and CartDAO logic.
 * 
 * Key Changes from Legacy:
 * - Uses userId (from Cognito JWT sub claim) instead of anonymous session_id
 * - Uses UUID strings for productId instead of INT AUTO_INCREMENT
 * - Stores price snapshot at time of adding to cart
 * - DynamoDB composite key: userId (hash) + productId (range)
 */

export interface CartItem {
  productId: string;          // UUID v4
  productName: string;        // Snapshot from Product table
  quantity: number;           // Min: 1, Max: 99
  priceSnapshot: number;      // Price at time of adding to cart
  subtotal: number;           // Calculated: quantity * priceSnapshot
  addedAt: string;            // ISO-8601 timestamp
  updatedAt: string;          // ISO-8601 timestamp
}

export interface Cart {
  userId: string;             // Cognito JWT sub claim (partition key)
  items: CartItem[];          // Array of cart items
  totalItems: number;         // Count of unique items
  totalQuantity: number;      // Sum of all quantities
  totalAmount: number;        // Sum of all subtotals
}

export interface AddCartItemRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

/**
 * Custom Error Classes
 */
export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CartError';
  }
}

export class CartItemNotFoundError extends CartError {
  constructor(productId: string) {
    super(`Cart item with product ID '${productId}' not found`);
    this.name = 'CartItemNotFoundError';
  }
}

export class InsufficientStockError extends CartError {
  public readonly requestedQuantity: number;
  public readonly availableStock: number;
  public readonly productId: string;

  constructor(productId: string, requestedQuantity: number, availableStock: number) {
    super(
      `Requested quantity (${requestedQuantity}) exceeds available stock (${availableStock}) for product '${productId}'`
    );
    this.name = 'InsufficientStockError';
    this.productId = productId;
    this.requestedQuantity = requestedQuantity;
    this.availableStock = availableStock;
  }
}

export class ValidationError extends CartError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation Functions
 */
export function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity)) {
    throw new ValidationError('Quantity must be an integer');
  }
  if (quantity < 1) {
    throw new ValidationError('Quantity must be at least 1');
  }
  if (quantity > 99) {
    throw new ValidationError('Quantity cannot exceed 99');
  }
}

export function validateProductId(productId: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    throw new ValidationError('Invalid productId format. Must be a valid UUID v4');
  }
}

/**
 * Calculate cart totals from items
 */
export function calculateCartTotals(items: CartItem[]): {
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
} {
  return {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}
