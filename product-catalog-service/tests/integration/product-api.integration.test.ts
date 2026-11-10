import request from 'supertest';
import { app } from '../../src/app';
import { DynamoDBConfig } from '../../src/config/dynamodb.config';

describe('Product API Integration Tests', () => {
  describe('GET /api/v1/products', () => {
    it('should return products with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/products?category=Electronics')
        .expect(200);

      expect(response.body.products).toBeInstanceOf(Array);
      response.body.products.forEach((product: any) => {
        expect(product.category).toBe('Electronics');
      });
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/products?minPrice=10&maxPrice=100')
        .expect(200);

      expect(response.body.products).toBeInstanceOf(Array);
      response.body.products.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(10);
        expect(product.price).toBeLessThanOrEqual(100);
      });
    });

    it('should filter by inStock status', async () => {
      const response = await request(app)
        .get('/api/v1/products?inStock=true')
        .expect(200);

      expect(response.body.products).toBeInstanceOf(Array);
      response.body.products.forEach((product: any) => {
        expect(product.inStock).toBe(true);
      });
    });

    it('should sort by price ascending', async () => {
      const response = await request(app)
        .get('/api/v1/products?sortBy=price&order=asc&limit=10')
        .expect(200);

      const prices = response.body.products.map((p: any) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('should sort by price descending', async () => {
      const response = await request(app)
        .get('/api/v1/products?sortBy=price&order=desc&limit=10')
        .expect(200);

      const prices = response.body.products.map((p: any) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=5')
        .expect(200);

      expect(response.body.products.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=101')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Limit must be between 1 and 100');
    });

    it('should return 400 for invalid category', async () => {
      const response = await request(app)
        .get('/api/v1/products?category=InvalidCategory')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Invalid category');
    });

    it('should return 400 for invalid price range', async () => {
      const response = await request(app)
        .get('/api/v1/products?minPrice=100&maxPrice=50')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('minPrice cannot be greater than maxPrice');
    });

    it('should return 400 for invalid sortBy', async () => {
      const response = await request(app)
        .get('/api/v1/products?sortBy=invalidField')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Invalid sortBy field');
    });

    it('should return 400 for invalid nextToken', async () => {
      const response = await request(app)
        .get('/api/v1/products?nextToken=invalid-token')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
      expect(response.body.detail).toContain('Invalid pagination token');
    });

    it('should handle pagination with nextToken', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/v1/products?limit=5')
        .expect(200);

      if (response1.body.pagination.hasMore) {
        const nextToken = response1.body.pagination.nextToken;

        // Second request with nextToken
        const response2 = await request(app)
          .get(`/api/v1/products?limit=5&nextToken=${nextToken}`)
          .expect(200);

        expect(response2.body.products).toBeInstanceOf(Array);
        expect(response2.body.pagination.limit).toBe(5);
      }
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/v1/products?category=Electronics&minPrice=50&maxPrice=500&inStock=true&sortBy=price&order=asc')
        .expect(200);

      expect(response.body.products).toBeInstanceOf(Array);
      response.body.products.forEach((product: any) => {
        expect(product.category).toBe('Electronics');
        expect(product.price).toBeGreaterThanOrEqual(50);
        expect(product.price).toBeLessThanOrEqual(500);
        expect(product.inStock).toBe(true);
      });
    });

    it('should return empty array when no products match filters', async () => {
      const response = await request(app)
        .get('/api/v1/products?category=Electronics&minPrice=10000&maxPrice=20000')
        .expect(200);

      expect(response.body.products).toEqual([]);
      expect(response.body.pagination.hasMore).toBe(false);
    });

    it('should set Content-Type to application/json', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    it('should return a single product by ID', async () => {
      // First, get a list of products to get a valid ID
      const listResponse = await request(app)
        .get('/api/v1/products?limit=1')
        .expect(200);

      if (listResponse.body.products.length > 0) {
        const productId = listResponse.body.products[0].productId;

        const response = await request(app)
          .get(`/api/v1/products/${productId}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('productId', productId);
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('price');
        expect(response.body.data).toHaveProperty('currency');
        expect(response.body.data).toHaveProperty('category');
        expect(response.body.data).toHaveProperty('inStock');
        expect(response.body.data).toHaveProperty('stockQuantity');
      }
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.type).toContain('not-found');
      expect(response.body.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/products/invalid-id')
        .expect(400);

      expect(response.body.type).toContain('validation-error');
    });
  });

  describe('Response Format Validation', () => {
    it('should include all required product fields', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=1')
        .expect(200);

      if (response.body.products.length > 0) {
        const product = response.body.products[0];
        
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
      }
    });

    it('should have correct data types for product fields', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=1')
        .expect(200);

      if (response.body.products.length > 0) {
        const product = response.body.products[0];
        
        expect(typeof product.productId).toBe('string');
        expect(typeof product.name).toBe('string');
        expect(typeof product.description).toBe('string');
        expect(typeof product.price).toBe('number');
        expect(typeof product.currency).toBe('string');
        expect(typeof product.category).toBe('string');
        expect(typeof product.inStock).toBe('boolean');
        expect(typeof product.stockQuantity).toBe('number');
        expect(typeof product.createdAt).toBe('string');
        expect(typeof product.updatedAt).toBe('string');
      }
    });

    it('should validate price > 0', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=10')
        .expect(200);

      response.body.products.forEach((product: any) => {
        expect(product.price).toBeGreaterThan(0);
      });
    });

    it('should validate stockQuantity >= 0', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=10')
        .expect(200);

      response.body.products.forEach((product: any) => {
        expect(product.stockQuantity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should validate inStock matches stockQuantity > 0', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=10')
        .expect(200);

      response.body.products.forEach((product: any) => {
        if (product.stockQuantity > 0) {
          expect(product.inStock).toBe(true);
        } else {
          expect(product.inStock).toBe(false);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should return RFC 7807 Problem Details format for errors', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=101')
        .expect(400);

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('detail');
      expect(response.body).toHaveProperty('instance');
    });

    it('should include instance path in error response', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=101')
        .expect(400);

      expect(response.body.instance).toContain('/api/v1/products');
    });
  });
});
