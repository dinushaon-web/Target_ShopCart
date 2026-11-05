/**
 * Unit Tests for Cart Service
 * 
 * Tests business logic and validation rules
 */

import { CartService } from '../../src/services/cart.service';
import { CartRepository } from '../../src/repositories/cart.repository';
import { ValidationError } from '../../src/utils/errors';

jest.mock('../../src/repositories/cart.repository');

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepository: jest.Mocked<CartRepository>;

  beforeEach(() => {
    mockCartRepository = new CartRepository() as jest.Mocked<CartRepository>;
    cartService = new CartService();
    (cartService as any).cartRepository = mockCartRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should retrieve cart for user', async () => {
      const mockCart = {
        userId: 'user-123',
        items: [],
        totalAmount: 0,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockCartRepository.getCartByUserId = jest.fn().mockResolvedValue(mockCart);

      const result = await cartService.getCart('user-123');

      expect(result).toEqual(mockCart);
      expect(mockCartRepository.getCartByUserId).toHaveBeenCalledWith('user-123');
    });
  });

  describe('addItemToCart', () => {
    it('should add item to cart successfully', async () => {
      const mockCart = {
        userId: 'user-123',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            productName: 'Product 1',
            quantity: 2,
            price: 10.99
          }
        ],
        totalAmount: 21.98,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockCartRepository.addOrUpdateCartItem = jest.fn().mockResolvedValue(mockCart);

      const result = await cartService.addItemToCart(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'Product 1',
        2,
        10.99
      );

      expect(result).toEqual(mockCart);
      expect(mockCartRepository.addOrUpdateCartItem).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'Product 1',
        2,
        10.99
      );
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(
        cartService.addItemToCart('user-123', 'invalid-uuid', 'Product 1', 2, 10.99)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if quantity <= 0', async () => {
      await expect(
        cartService.addItemToCart(
          'user-123',
          '550e8400-e29b-41d4-a716-446655440000',
          'Product 1',
          0,
          10.99
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if price <= 0', async () => {
      await expect(
        cartService.addItemToCart(
          'user-123',
          '550e8400-e29b-41d4-a716-446655440000',
          'Product 1',
          2,
          0
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if productName is empty', async () => {
      await expect(
        cartService.addItemToCart(
          'user-123',
          '550e8400-e29b-41d4-a716-446655440000',
          '',
          2,
          10.99
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateCartItemQuantity', () => {
    it('should update item quantity successfully', async () => {
      const mockCart = {
        userId: 'user-123',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            productName: 'Product 1',
            quantity: 5,
            price: 10.99
          }
        ],
        totalAmount: 54.95,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockCartRepository.updateCartItemQuantity = jest.fn().mockResolvedValue(mockCart);

      const result = await cartService.updateCartItemQuantity(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        5
      );

      expect(result).toEqual(mockCart);
    });

    it('should throw ValidationError if quantity < 0', async () => {
      await expect(
        cartService.updateCartItemQuantity(
          'user-123',
          '550e8400-e29b-41d4-a716-446655440000',
          -1
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(
        cartService.updateCartItemQuantity('user-123', 'invalid-uuid', 5)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removeCartItem', () => {
    it('should remove item from cart successfully', async () => {
      const mockCart = {
        userId: 'user-123',
        items: [],
        totalAmount: 0,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockCartRepository.removeCartItem = jest.fn().mockResolvedValue(mockCart);

      const result = await cartService.removeCartItem(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toEqual(mockCart);
      expect(mockCartRepository.removeCartItem).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(
        cartService.removeCartItem('user-123', 'invalid-uuid')
      ).rejects.toThrow(ValidationError);
    });
  });
});
