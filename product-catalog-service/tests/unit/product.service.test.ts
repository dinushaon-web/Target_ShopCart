import { ProductService } from '../../src/services/product.service';
import { ProductRepository } from '../../src/repositories/product.repository';
import { ValidationError, InsufficientStockError } from '../../src/models/product.model';

jest.mock('../../src/repositories/product.repository');

describe('ProductService', () => {
  let productService: ProductService;
  let mockRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    productService = new ProductService();
    (productService as any).repository = mockRepository;
  });

  describe('getAllProducts', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        {
          productId: '123',
          name: 'Test Product',
          description: 'Test Description',
          price: 10.99,
          stock: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];
      mockRepository.getAllProducts = jest.fn().mockResolvedValue({
        items: mockProducts,
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts(50);

      expect(result.items).toEqual(mockProducts);
      expect(mockRepository.getAllProducts).toHaveBeenCalledWith(50, undefined);
    });
  });

  describe('getProductById', () => {
    it('should return a product when found', async () => {
      const mockProduct = {
        productId: '123',
        name: 'Test Product',
        description: 'Test Description',
        price: 10.99,
        stock: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };
      mockRepository.getProductById = jest.fn().mockResolvedValue(mockProduct);

      const result = await productService.getProductById('123');

      expect(result).toEqual(mockProduct);
    });

    it('should throw ValidationError when productId is empty', async () => {
      await expect(productService.getProductById('')).rejects.toThrow(ValidationError);
    });
  });

  describe('decrementStock', () => {
    it('should throw InsufficientStockError when stock is insufficient', async () => {
      mockRepository.decrementStock = jest.fn().mockRejectedValue(
        new InsufficientStockError('Insufficient stock')
      );

      await expect(productService.decrementStock('123', 10)).rejects.toThrow(
        InsufficientStockError
      );
    });

    it('should successfully decrement stock when sufficient', async () => {
      mockRepository.decrementStock = jest.fn().mockResolvedValue(undefined);

      await expect(productService.decrementStock('123', 5)).resolves.not.toThrow();
      expect(mockRepository.decrementStock).toHaveBeenCalledWith('123', 5);
    });

    it('should throw ValidationError when quantity is zero or negative', async () => {
      await expect(productService.decrementStock('123', 0)).rejects.toThrow(ValidationError);
      await expect(productService.decrementStock('123', -1)).rejects.toThrow(ValidationError);
    });
  });

  describe('createProduct', () => {
    it('should throw ValidationError when price is zero or negative', async () => {
      const invalidProduct = {
        name: 'Test Product',
        description: 'Test Description',
        price: 0,
        stock: 5
      };

      await expect(productService.createProduct(invalidProduct)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when stock is negative', async () => {
      const invalidProduct = {
        name: 'Test Product',
        description: 'Test Description',
        price: 10.99,
        stock: -1
      };

      await expect(productService.createProduct(invalidProduct)).rejects.toThrow(ValidationError);
    });
  });
});
