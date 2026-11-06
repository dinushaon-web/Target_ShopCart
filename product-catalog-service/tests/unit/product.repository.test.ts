import { ProductRepository, GetAllProductsParams } from '../../src/repositories/product.repository';
import { Product } from '../../src/models/product.model';

// Mock DynamoDB client
jest.mock('../../src/config/dynamodb.config', () => ({
  DynamoDBConfig: {
    getClient: jest.fn(() => ({
      send: jest.fn()
    }))
  }
}));

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let mockDocClient: any;

  beforeEach(() => {
    repository = new ProductRepository();
    mockDocClient = require('../../src/config/dynamodb.config').DynamoDBConfig.getClient();
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    const mockProducts: Product[] = [
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Wireless Headphones',
        description: 'High-quality headphones',
        price: 99.99,
        currency: 'USD',
        category: 'electronics',
        imageUrl: 'https://cdn.shopcart.com/headphones.jpg',
        inStock: true,
        stockQuantity: 50,
        popularity: 100,
        createdAt: '2024-01-20T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z'
      },
      {
        productId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Bluetooth Speaker',
        description: 'Portable speaker',
        price: 49.99,
        currency: 'USD',
        category: 'electronics',
        imageUrl: 'https://cdn.shopcart.com/speaker.jpg',
        inStock: true,
        stockQuantity: 120,
        popularity: 85,
        createdAt: '2024-01-21T00:00:00Z',
        updatedAt: '2024-01-21T00:00:00Z'
      }
    ];

    it('should return products with default pagination', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = {};
      const result = await repository.getAllProducts(params);

      expect(result.products).toHaveLength(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.nextToken).toBeNull();
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should filter by category', async () => {
      const electronicsProducts = mockProducts.filter(p => p.category === 'electronics');
      mockDocClient.send.mockResolvedValue({
        Items: electronicsProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { category: 'electronics' };
      const result = await repository.getAllProducts(params);

      expect(result.products.every(p => p.category === 'electronics')).toBe(true);
    });

    it('should filter by price range', async () => {
      const filteredProducts = mockProducts.filter(p => p.price >= 10 && p.price <= 50);
      mockDocClient.send.mockResolvedValue({
        Items: filteredProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { minPrice: 10, maxPrice: 50 };
      const result = await repository.getAllProducts(params);

      expect(result.products.every(p => p.price >= 10 && p.price <= 50)).toBe(true);
    });

    it('should filter by inStock', async () => {
      const inStockProducts = mockProducts.filter(p => p.inStock === true);
      mockDocClient.send.mockResolvedValue({
        Items: inStockProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { inStock: true };
      const result = await repository.getAllProducts(params);

      expect(result.products.every(p => p.inStock === true)).toBe(true);
    });

    it('should sort by price ascending', async () => {
      const sortedProducts = [...mockProducts].sort((a, b) => a.price - b.price);
      mockDocClient.send.mockResolvedValue({
        Items: sortedProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { sortBy: 'price', sortOrder: 'asc', category: 'electronics' };
      const result = await repository.getAllProducts(params);

      const prices = result.products.map(p => p.price);
      expect(prices).toEqual([49.99, 99.99]);
    });

    it('should sort by price descending', async () => {
      const sortedProducts = [...mockProducts].sort((a, b) => b.price - a.price);
      mockDocClient.send.mockResolvedValue({
        Items: sortedProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { sortBy: 'price', sortOrder: 'desc', category: 'electronics' };
      const result = await repository.getAllProducts(params);

      const prices = result.products.map(p => p.price);
      expect(prices).toEqual([99.99, 49.99]);
    });

    it('should sort by name alphabetically', async () => {
      const sortedProducts = [...mockProducts].sort((a, b) => a.name.localeCompare(b.name));
      mockDocClient.send.mockResolvedValue({
        Items: sortedProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { sortBy: 'name', sortOrder: 'asc', category: 'electronics' };
      const result = await repository.getAllProducts(params);

      const names = result.products.map(p => p.name);
      expect(names).toEqual(['Bluetooth Speaker', 'Wireless Headphones']);
    });

    it('should sort by popularity', async () => {
      const sortedProducts = [...mockProducts].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      mockDocClient.send.mockResolvedValue({
        Items: sortedProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { sortBy: 'popularity', sortOrder: 'desc', category: 'electronics' };
      const result = await repository.getAllProducts(params);

      const popularity = result.products.map(p => p.popularity);
      expect(popularity).toEqual([100, 85]);
    });

    it('should return pagination metadata with nextToken', async () => {
      const lastKey = { productId: '550e8400-e29b-41d4-a716-446655440000' };
      mockDocClient.send.mockResolvedValue({
        Items: [mockProducts[0]],
        LastEvaluatedKey: lastKey
      });

      const params: GetAllProductsParams = { limit: 1 };
      const result = await repository.getAllProducts(params);

      expect(result.pagination.nextToken).toBeTruthy();
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.limit).toBe(1);
    });

    it('should handle empty results', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = { category: 'nonexistent' };
      const result = await repository.getAllProducts(params);

      expect(result.products).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should combine multiple filters', async () => {
      const filteredProducts = mockProducts.filter(
        p => p.category === 'electronics' && p.price >= 40 && p.price <= 100 && p.inStock
      );
      mockDocClient.send.mockResolvedValue({
        Items: filteredProducts,
        LastEvaluatedKey: undefined
      });

      const params: GetAllProductsParams = {
        category: 'electronics',
        minPrice: 40,
        maxPrice: 100,
        inStock: true
      };
      const result = await repository.getAllProducts(params);

      expect(result.products.every(
        p => p.category === 'electronics' && p.price >= 40 && p.price <= 100 && p.inStock
      )).toBe(true);
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      const mockProduct: Product = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Wireless Headphones',
        description: 'High-quality headphones',
        price: 99.99,
        currency: 'USD',
        category: 'electronics',
        imageUrl: 'https://cdn.shopcart.com/headphones.jpg',
        inStock: true,
        stockQuantity: 50,
        popularity: 100,
        createdAt: '2024-01-20T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z'
      };

      mockDocClient.send.mockResolvedValue({ Item: mockProduct });

      const result = await repository.getProductById('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      mockDocClient.send.mockResolvedValue({ Item: undefined });

      const result = await repository.getProductById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock successfully', async () => {
      mockDocClient.send.mockResolvedValue({});

      await expect(
        repository.decrementStock('550e8400-e29b-41d4-a716-446655440000', 5)
      ).resolves.not.toThrow();
    });

    it('should throw InsufficientStockError when stock is insufficient', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockDocClient.send.mockRejectedValue(error);

      await expect(
        repository.decrementStock('550e8400-e29b-41d4-a716-446655440000', 100)
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('incrementStock', () => {
    it('should increment stock successfully', async () => {
      mockDocClient.send.mockResolvedValue({});

      await expect(
        repository.incrementStock('550e8400-e29b-41d4-a716-446655440000', 10)
      ).resolves.not.toThrow();
    });
  });
});
