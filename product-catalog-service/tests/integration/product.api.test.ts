import request from 'supertest';
import { app } from '../../src/app';

// Mock DynamoDB client for integration tests
jest.mock('../../src/config/dynamodb.config', () => ({
  DynamoDBConfig: {
    getClient: jest.fn(() => ({
      send: jest.fn()
    }))
  }
}));

describe('Product API Integration Tests', () => {
  let mockDocClient: any;

  beforeEach(() => {
    mockDocClient = require('../../src/config/dynamodb.config').DynamoDBConfig.getClient();
    jest.clearAllMocks();
  });

  describe('GET /api/v1/products', () => {
    it('should return paginated products with default limit', async () => {
      const mockProducts = [
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
        }
      ];

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.products).toHaveLength(1);
    });

    it('should filter by category', async () => {
      const mockProducts = [
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
        }
      ];

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products?category=electronics');

      expect(response.status).toBe(200);
      expect(response.body.products.every((p: any) => p.category === 'electronics')).toBe(true);
    });

    it('should filter by price range', async () => {
      const mockProducts = [
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

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products?minPrice=40&maxPrice=60');

      expect(response.status).toBe(200);
      expect(response.body.products.every((p: any) => p.price >= 40 && p.price <= 60)).toBe(true);
    });

    it('should filter by inStock', async () => {
      const mockProducts = [
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
        }
      ];

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products?inStock=true');

      expect(response.status).toBe(200);
      expect(response.body.products.every((p: any) => p.inStock === true)).toBe(true);
    });

    it('should sort by price ascending', async () => {
      const mockProducts = [
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
        },
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
        }
      ];

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products?sortBy=price&sortOrder=asc&category=electronics');

      expect(response.status).toBe(200);
      const prices = response.body.products.map((p: any) => p.price);
      expect(prices).toEqual([49.99, 99.99]);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app).get('/api/v1/products?limit=200');

      expect(response.status).toBe(400);
      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Limit');
    });

    it('should return 400 for invalid price range', async () => {
      const response = await request(app).get('/api/v1/products?minPrice=100&maxPrice=50');

      expect(response.status).toBe(400);
      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('minPrice cannot be greater than maxPrice');
    });

    it('should return 400 for negative price', async () => {
      const response = await request(app).get('/api/v1/products?minPrice=-10');

      expect(response.status).toBe(400);
      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('minPrice must be >= 0');
    });

    it('should return 400 for invalid sortBy', async () => {
      const response = await request(app).get('/api/v1/products?sortBy=invalid');

      expect(response.status).toBe(400);
      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('sortBy must be one of');
    });

    it('should handle pagination with nextToken', async () => {
      const lastKey = { productId: '550e8400-e29b-41d4-a716-446655440000' };
      const mockProducts = [
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
        }
      ];

      mockDocClient.send.mockResolvedValue({
        Items: mockProducts,
        LastEvaluatedKey: lastKey
      });

      const response = await request(app).get('/api/v1/products?limit=1');

      expect(response.status).toBe(200);
      expect(response.body.pagination.nextToken).toBeTruthy();
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should return empty array when no products match filters', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined
      });

      const response = await request(app).get('/api/v1/products?category=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(0);
      expect(response.body.pagination.hasMore).toBe(false);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return product when found', async () => {
      const mockProduct = {
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

      const response = await request(app).get('/api/v1/products/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.productId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return RFC 7807 error for non-existent product', async () => {
      mockDocClient.send.mockResolvedValue({ Item: undefined });

      const response = await request(app).get('/api/v1/products/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status', 404);
      expect(response.body).toHaveProperty('detail');
      expect(response.body).toHaveProperty('instance');
      expect(response.body.type).toBe('https://api.shopcart.com/problems/product-not-found');
      expect(response.body.title).toBe('Product Not Found');
      expect(response.body.detail).toContain('does not exist');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/v1/products/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Invalid product ID format');
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDocClient.send.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app).get('/api/v1/products');

      expect(response.status).toBe(500);
      expect(response.body.type).toContain('internal-error');
    });
  });
});
