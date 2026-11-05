/**
 * Unit Tests for Product Service
 * 
 * Tests business logic and validation rules
 */

import { ProductService } from '../../src/services/product.service';
import { ProductRepository } from '../../src/repositories/product.repository';
import { ValidationError } from '../../src/utils/errors';

jest.mock('../../src/repositories/product.repository');

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    productService = new ProductService();
    (productService as any).productRepository = mockProductRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('should retrieve products with default pagination', async () => {
      const mockProducts = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Product 1',
          description: 'Description 1',
          price: 10.99,
          stock: 5,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockProductRepository.getAllProducts = jest.fn().mockResolvedValue({
        products: mockProducts,
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts();

      expect(result.products).toEqual(mockProducts);
      expect(result.cursor).toBeNull();
      expect(mockProductRepository.getAllProducts).toHaveBeenCalledWith(20, undefined);
    });

    it('should throw ValidationError if limit < 1', async () => {
      await expect(productService.getAllProducts(0))
        .rejects.toThrow(ValidationError);
      await expect(productService.getAllProducts(-1))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if limit > 100', async () => {
      await expect(productService.getAllProducts(101))
        .rejects.toThrow(ValidationError);
    });

    it('should decode cursor and pass to repository', async () => {
      const lastKey = { PK: 'PRODUCT#123', SK: 'METADATA' };
      const cursor = Buffer.from(JSON.stringify(lastKey)).toString('base64');

      mockProductRepository.getAllProducts = jest.fn().mockResolvedValue({
        products: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts(20, cursor);

      expect(mockProductRepository.getAllProducts).toHaveBeenCalledWith(20, lastKey);
    });
  });

  describe('getProductById', () => {
    it('should retrieve product by valid UUID', async () => {
      const mockProduct = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Product 1',
        description: 'Description 1',
        price: 10.99,
        stock: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProductRepository.getProductById = jest.fn().mockResolvedValue(mockProduct);

      const result = await productService.getProductById('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual(mockProduct);
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(productService.getProductById('invalid-uuid'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if product price <= 0', async () => {
      const mockProduct = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Product 1',
        description: 'Description 1',
        price: 0,
        stock: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProductRepository.getProductById = jest.fn().mockResolvedValue(mockProduct);

      await expect(productService.getProductById('550e8400-e29b-41d4-a716-446655440000'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock successfully', async () => {
      const mockProduct = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Product 1',
        description: 'Description 1',
        price: 10.99,
        stock: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProductRepository.decrementStock = jest.fn().mockResolvedValue(mockProduct);

      const result = await productService.decrementStock('550e8400-e29b-41d4-a716-446655440000', 2);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.decrementStock).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        2
      );
    });

    it('should throw ValidationError if quantity <= 0', async () => {
      await expect(productService.decrementStock('550e8400-e29b-41d4-a716-446655440000', 0))
        .rejects.toThrow(ValidationError);
      await expect(productService.decrementStock('550e8400-e29b-41d4-a716-446655440000', -1))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(productService.decrementStock('invalid-uuid', 2))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if product price <= 0 after decrement', async () => {
      const mockProduct = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Product 1',
        description: 'Description 1',
        price: 0,
        stock: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProductRepository.decrementStock = jest.fn().mockResolvedValue(mockProduct);

      await expect(productService.decrementStock('550e8400-e29b-41d4-a716-446655440000', 2))
        .rejects.toThrow(ValidationError);
    });
  });
});
