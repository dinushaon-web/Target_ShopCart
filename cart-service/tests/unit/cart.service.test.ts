/**
 * Cart Service Unit Tests
 * 
 * Tests for cart business logic.
 */

import { CartService } from '../../src/services/cart.service';
import { CartRepository } from '../../src/repositories/cart.repository';
import { ProductRepository } from '../../src/repositories/product.repository';
import {
  ValidationError,
  InsufficientStockError,
  CartItemNotFoundError,
} from '../../src/models/cart.model';

// Mock repositories
jest.mock('../../src/repositories/cart.repository');
jest.mock('../../src/repositories/product.repository');
jest.mock('../../src/utils/logger.util');

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepository: jest.Mocked<CartRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    cartService = new CartService();
    mockCartRepository = (cartService as any).cartRepository;
    mockProductRepository = (cartService as any).productRepository;
  });

  describe('getCart', () => {
    it('should return cart with items and totals', async () => {
      const userId = 'user-123';
      const mockItems = [
        {
          productId: 'product-1',
          productName: 'Product 1',
          quantity: 2,
          priceSnapshot: 10.0,
          subtotal: 20.0,
          addedAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockCartRepository.getCartItems.mockResolvedValue(mockItems);

      const result = await cartService.getCart(userId);

      expect(result.userId).toBe(userId);
      expect(result.items).toEqual(mockItems);
      expect(result.totalItems).toBe(1);
      expect(result.totalQuantity).toBe(2);
      expect(result.totalAmount).toBe(20.0);
      expect(mockCartRepository.getCartItems).toHaveBeenCalledWith(userId);
    });

    it('should return empty cart when no items', async () => {
      const userId = 'user-123';
      mockCartRepository.getCartItems.mockResolvedValue([]);

      const result = await cartService.getCart(userId);

      expect(result.userId).toBe(userId);
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('addItemToCart', () => {
    it('should add new item to cart successfully', async () => {
      const userId = 'user-123';
      const request = { productId: 'product-1', quantity: 2 };
      const mockProduct = {
        productId: 'product-1',
        name: 'Product 1',
        price: 10.0,
        stock: 50,
        category: 'Electronics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const mockCartItem = {
        productId: 'product-1',
        productName: 'Product 1',
        quantity: 2,
        priceSnapshot: 10.0,
        subtotal: 20.0,
        addedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);
      mockCartRepository.getCartItem.mockResolvedValue(null);
      mockCartRepository.addOrUpdateCartItem.mockResolvedValue(mockCartItem);

      const result = await cartService.addItemToCart(userId, request);

      expect(result).toEqual(mockCartItem);
      expect(mockProductRepository.getProductById).toHaveBeenCalledWith('product-1');
      expect(mockCartRepository.addOrUpdateCartItem).toHaveBeenCalledWith(
        userId,
        'product-1',
        'Product 1',
        2,
        10.0
      );
    });

    it('should throw ValidationError when product not found', async () => {
      const userId = 'user-123';
      const request = { productId: 'product-1', quantity: 2 };

      mockProductRepository.getProductById.mockResolvedValue(null);

      await expect(cartService.addItemToCart(userId, request)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when product price is zero', async () => {
      const userId = 'user-123';
      const request = { productId: 'product-1', quantity: 2 };
      const mockProduct = {
        productId: 'product-1',
        name: 'Product 1',
        price: 0,
        stock: 50,
        category: 'Electronics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);

      await expect(cartService.addItemToCart(userId, request)).rejects.toThrow(
        'Product price must be greater than 0'
      );
    });

    it('should throw InsufficientStockError when stock is insufficient', async () => {
      const userId = 'user-123';
      const request = { productId: 'product-1', quantity: 10 };
      const mockProduct = {
        productId: 'product-1',
        name: 'Product 1',
        price: 10.0,
        stock: 5,
        category: 'Electronics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);
      mockCartRepository.getCartItem.mockResolvedValue(null);

      await expect(cartService.addItemToCart(userId, request)).rejects.toThrow(
        InsufficientStockError
      );
    });
  });

  describe('updateCartItemQuantity', () => {
    it('should update cart item quantity successfully', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const request = { quantity: 5 };
      const mockExistingItem = {
        productId: 'product-1',
        productName: 'Product 1',
        quantity: 2,
        priceSnapshot: 10.0,
        subtotal: 20.0,
        addedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const mockProduct = {
        productId: 'product-1',
        name: 'Product 1',
        price: 10.0,
        stock: 50,
        category: 'Electronics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const mockUpdatedItem = {
        ...mockExistingItem,
        quantity: 5,
        subtotal: 50.0,
      };

      mockCartRepository.getCartItem.mockResolvedValue(mockExistingItem);
      mockProductRepository.getProductById.mockResolvedValue(mockProduct);
      mockCartRepository.updateCartItemQuantity.mockResolvedValue(mockUpdatedItem);

      const result = await cartService.updateCartItemQuantity(userId, productId, request);

      expect(result).toEqual(mockUpdatedItem);
      expect(mockCartRepository.updateCartItemQuantity).toHaveBeenCalledWith(
        userId,
        productId,
        5
      );
    });

    it('should throw CartItemNotFoundError when item not in cart', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const request = { quantity: 5 };

      mockCartRepository.getCartItem.mockResolvedValue(null);

      await expect(
        cartService.updateCartItemQuantity(userId, productId, request)
      ).rejects.toThrow(CartItemNotFoundError);
    });
  });

  describe('removeCartItem', () => {
    it('should remove cart item successfully', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const mockExistingItem = {
        productId: 'product-1',
        productName: 'Product 1',
        quantity: 2,
        priceSnapshot: 10.0,
        subtotal: 20.0,
        addedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockCartRepository.getCartItem.mockResolvedValue(mockExistingItem);
      mockCartRepository.removeCartItem.mockResolvedValue(undefined);

      await cartService.removeCartItem(userId, productId);

      expect(mockCartRepository.removeCartItem).toHaveBeenCalledWith(userId, productId);
    });

    it('should throw CartItemNotFoundError when item not found', async () => {
      const userId = 'user-123';
      const productId = 'product-1';

      mockCartRepository.getCartItem.mockResolvedValue(null);

      await expect(cartService.removeCartItem(userId, productId)).rejects.toThrow(
        CartItemNotFoundError
      );
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      const userId = 'user-123';

      mockCartRepository.clearCart.mockResolvedValue(undefined);

      await cartService.clearCart(userId);

      expect(mockCartRepository.clearCart).toHaveBeenCalledWith(userId);
    });
  });
});
