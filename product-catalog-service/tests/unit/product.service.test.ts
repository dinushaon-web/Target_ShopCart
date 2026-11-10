import { ProductService } from '../../src/services/product.service';
import { ProductRepository } from '../../src/repositories/product.repository';
import { ValidationError, Product } from '../../src/models/product.model';

jest.mock('../../src/repositories/product.repository');

describe('ProductService - Enhanced Query Parameters', () => {
  let productService: ProductService;
  let mockRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    productService = new ProductService();
    (productService as any).repository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Parameter Validation', () => {
    it('should validate limit within range (1-100)', async () => {
      await expect(
        productService.getAllProducts({ limit: 101 })
      ).rejects.toThrow('Limit must be between 1 and 100');

      await expect(
        productService.getAllProducts({ limit: 0 })
      ).rejects.toThrow('Limit must be between 1 and 100');

      await expect(
        productService.getAllProducts({ limit: -5 })
      ).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should accept valid limit values', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ limit: 1 });
      await productService.getAllProducts({ limit: 50 });
      await productService.getAllProducts({ limit: 100 });

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(3);
    });

    it('should default to limit 20 when not provided', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({});

      expect(result.pagination.limit).toBe(20);
    });

    it('should validate category enum', async () => {
      await expect(
        productService.getAllProducts({ category: 'InvalidCategory' })
      ).rejects.toThrow('Invalid category');

      await expect(
        productService.getAllProducts({ category: 'Toys' })
      ).rejects.toThrow('Invalid category');
    });

    it('should accept valid category values', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      const validCategories = [
        'Electronics',
        'Clothing',
        'Home & Garden',
        'Sports & Outdoors',
        'Books & Media',
        'General'
      ];

      for (const category of validCategories) {
        await productService.getAllProducts({ category });
      }

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(validCategories.length);
    });

    it('should validate price range logic', async () => {
      await expect(
        productService.getAllProducts({ minPrice: 100, maxPrice: 50 })
      ).rejects.toThrow('minPrice cannot be greater than maxPrice');
    });

    it('should accept valid price ranges', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ minPrice: 10, maxPrice: 100 });
      await productService.getAllProducts({ minPrice: 50, maxPrice: 50 });
      await productService.getAllProducts({ minPrice: 0, maxPrice: 1000 });

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(3);
    });

    it('should validate minPrice is non-negative', async () => {
      await expect(
        productService.getAllProducts({ minPrice: -10 })
      ).rejects.toThrow('minPrice must be a valid number >= 0');
    });

    it('should validate maxPrice is non-negative', async () => {
      await expect(
        productService.getAllProducts({ maxPrice: -50 })
      ).rejects.toThrow('maxPrice must be a valid number >= 0');
    });

    it('should validate sortBy field', async () => {
      await expect(
        productService.getAllProducts({ sortBy: 'invalidField' })
      ).rejects.toThrow('Invalid sortBy field');
    });

    it('should accept valid sortBy values', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ sortBy: 'name' });
      await productService.getAllProducts({ sortBy: 'price' });
      await productService.getAllProducts({ sortBy: 'createdAt' });

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(3);
    });

    it('should default to sortBy createdAt when not provided', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({});

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'createdAt' }),
        undefined
      );
    });

    it('should validate order parameter', async () => {
      await expect(
        productService.getAllProducts({ order: 'invalid' as any })
      ).rejects.toThrow('Order must be either "asc" or "desc"');
    });

    it('should accept valid order values', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ order: 'asc' });
      await productService.getAllProducts({ order: 'desc' });

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(2);
    });

    it('should default to order desc when not provided', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({});

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ order: 'desc' }),
        undefined
      );
    });

    it('should handle inStock boolean parameter', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ inStock: true });
      await productService.getAllProducts({ inStock: false });

      expect(mockRepository.queryProducts).toHaveBeenCalledTimes(2);
    });

    it('should handle string boolean values for inStock', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ inStock: 'true' as any });
      await productService.getAllProducts({ inStock: 'false' as any });

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ inStock: true }),
        undefined
      );

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ inStock: false }),
        undefined
      );
    });

    it('should throw error for invalid nextToken', async () => {
      await expect(
        productService.getAllProducts({ nextToken: 'invalid-token' })
      ).rejects.toThrow('Invalid pagination token');
    });

    it('should decode valid nextToken', async () => {
      const lastEvaluatedKey = { productId: '123' };
      const nextToken = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');

      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ nextToken });

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.any(Object),
        lastEvaluatedKey
      );
    });
  });

  describe('Product Filtering', () => {
    const mockProducts: Product[] = [
      {
        productId: '1',
        name: 'Product 1',
        description: 'Description 1',
        price: 50,
        currency: 'USD',
        category: 'Electronics',
        imageUrl: null,
        inStock: true,
        stockQuantity: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        productId: '2',
        name: 'Product 2',
        description: 'Description 2',
        price: 100,
        currency: 'USD',
        category: 'Electronics',
        imageUrl: null,
        inStock: true,
        stockQuantity: 5,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ];

    it('should filter by category', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: mockProducts,
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({ category: 'Electronics' });

      expect(result.products).toHaveLength(2);
      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Electronics' }),
        undefined
      );
    });

    it('should filter by price range', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: mockProducts,
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ minPrice: 10, maxPrice: 50 });

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 10, maxPrice: 50 }),
        undefined
      );
    });

    it('should filter by inStock status', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: mockProducts,
        lastEvaluatedKey: undefined
      });

      await productService.getAllProducts({ inStock: true });

      expect(mockRepository.queryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ inStock: true }),
        undefined
      );
    });
  });

  describe('Pagination', () => {
    it('should encode nextToken correctly', async () => {
      const lastEvaluatedKey = { productId: '123', category: 'Electronics' };
      
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey
      });

      const result = await productService.getAllProducts({ limit: 20 });

      expect(result.pagination.nextToken).toBeDefined();
      
      const decoded = JSON.parse(
        Buffer.from(result.pagination.nextToken!, 'base64').toString('utf-8')
      );
      expect(decoded).toEqual(lastEvaluatedKey);
    });

    it('should set hasMore to true when lastEvaluatedKey exists', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: { productId: '123' }
      });

      const result = await productService.getAllProducts({ limit: 20 });

      expect(result.pagination.hasMore).toBe(true);
    });

    it('should set hasMore to false when lastEvaluatedKey is undefined', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({ limit: 20 });

      expect(result.pagination.hasMore).toBe(false);
    });

    it('should not include nextToken when hasMore is false', async () => {
      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({ limit: 20 });

      expect(result.pagination.nextToken).toBeUndefined();
    });
  });

  describe('Response Format', () => {
    it('should return products in new envelope format', async () => {
      const mockProducts: Product[] = [
        {
          productId: '1',
          name: 'Product 1',
          description: 'Description 1',
          price: 50,
          currency: 'USD',
          category: 'Electronics',
          imageUrl: null,
          inStock: true,
          stockQuantity: 10,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: mockProducts,
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({ limit: 20 });

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('hasMore');
      expect(result.products).toEqual(mockProducts);
    });

    it('should include all required product fields', async () => {
      const mockProduct: Product = {
        productId: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        currency: 'USD',
        category: 'Electronics',
        imageUrl: 'https://example.com/image.jpg',
        inStock: true,
        stockQuantity: 15,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockRepository.queryProducts = jest.fn().mockResolvedValue({
        items: [mockProduct],
        lastEvaluatedKey: undefined
      });

      const result = await productService.getAllProducts({});

      const product = result.products[0];
      expect(product).toHaveProperty('productId');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('currency');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('imageUrl');
      expect(product).toHaveProperty('inStock');
      expect(product).toHaveProperty('stockQuantity');
      expect(product).toHaveProperty('createdAt');
      expect(product).toHaveProperty('updatedAt');
    });
  });

  describe('Business Rules', () => {
    it('should validate product price > 0', async () => {
      await expect(
        productService.createProduct({
          name: 'Test',
          description: 'Test',
          price: 0,
          currency: 'USD',
          category: 'General',
          imageUrl: null,
          inStock: true,
          stockQuantity: 10
        })
      ).rejects.toThrow('Price must be greater than 0');
    });

    it('should validate stockQuantity >= 0', async () => {
      await expect(
        productService.createProduct({
          name: 'Test',
          description: 'Test',
          price: 10,
          currency: 'USD',
          category: 'General',
          imageUrl: null,
          inStock: false,
          stockQuantity: -5
        })
      ).rejects.toThrow('Stock quantity cannot be negative');
    });
  });
});
