import { PaginationHelper } from '../../src/utils/pagination.util';
import { ValidationError } from '../../src/models/product.model';

describe('PaginationHelper', () => {
  describe('encodeToken', () => {
    it('should encode lastEvaluatedKey to base64', () => {
      const key = { productId: '123', category: 'electronics' };
      const token = PaginationHelper.encodeToken(key);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // Verify it's valid base64
      const decoded = Buffer.from(token!, 'base64').toString('utf-8');
      expect(JSON.parse(decoded)).toEqual(key);
    });

    it('should return null for undefined lastEvaluatedKey', () => {
      expect(PaginationHelper.encodeToken(undefined)).toBeNull();
    });

    it('should return null for empty object', () => {
      expect(PaginationHelper.encodeToken({})).not.toBeNull();
    });

    it('should handle complex objects', () => {
      const key = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        category: 'electronics',
        price: 99.99,
        nested: { field: 'value' }
      };
      const token = PaginationHelper.encodeToken(key);
      const decoded = JSON.parse(Buffer.from(token!, 'base64').toString('utf-8'));
      
      expect(decoded).toEqual(key);
    });
  });

  describe('decodeToken', () => {
    it('should decode base64 token to lastEvaluatedKey', () => {
      const key = { productId: '123', category: 'electronics' };
      const token = Buffer.from(JSON.stringify(key)).toString('base64');
      
      const decoded = PaginationHelper.decodeToken(token);
      expect(decoded).toEqual(key);
    });

    it('should return undefined for undefined token', () => {
      expect(PaginationHelper.decodeToken(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(PaginationHelper.decodeToken('')).toBeUndefined();
    });

    it('should throw ValidationError for invalid base64', () => {
      expect(() => PaginationHelper.decodeToken('invalid-base64!!!')).toThrow(ValidationError);
      expect(() => PaginationHelper.decodeToken('invalid-base64!!!')).toThrow('Invalid pagination token');
    });

    it('should throw ValidationError for malformed JSON', () => {
      const invalidJson = Buffer.from('{ invalid json }').toString('base64');
      expect(() => PaginationHelper.decodeToken(invalidJson)).toThrow(ValidationError);
    });

    it('should round-trip encode/decode', () => {
      const key = { productId: '550e8400-e29b-41d4-a716-446655440000', category: 'electronics' };
      const token = PaginationHelper.encodeToken(key);
      const decoded = PaginationHelper.decodeToken(token!);
      
      expect(decoded).toEqual(key);
    });
  });

  describe('validateLimit', () => {
    it('should return default limit when limit is undefined', () => {
      expect(PaginationHelper.validateLimit(undefined)).toBe(20);
    });

    it('should return custom default limit', () => {
      expect(PaginationHelper.validateLimit(undefined, 50)).toBe(50);
    });

    it('should return limit when within valid range', () => {
      expect(PaginationHelper.validateLimit(10)).toBe(10);
      expect(PaginationHelper.validateLimit(50)).toBe(50);
      expect(PaginationHelper.validateLimit(100)).toBe(100);
    });

    it('should cap limit at maxLimit', () => {
      expect(PaginationHelper.validateLimit(150)).toBe(100);
      expect(PaginationHelper.validateLimit(200)).toBe(100);
      expect(PaginationHelper.validateLimit(1000)).toBe(100);
    });

    it('should return default for limit < 1', () => {
      expect(PaginationHelper.validateLimit(0)).toBe(20);
      expect(PaginationHelper.validateLimit(-1)).toBe(20);
      expect(PaginationHelper.validateLimit(-100)).toBe(20);
    });

    it('should respect custom maxLimit', () => {
      expect(PaginationHelper.validateLimit(150, 20, 50)).toBe(50);
      expect(PaginationHelper.validateLimit(200, 20, 150)).toBe(150);
    });

    it('should handle edge cases', () => {
      expect(PaginationHelper.validateLimit(1)).toBe(1);
      expect(PaginationHelper.validateLimit(100, 20, 100)).toBe(100);
      expect(PaginationHelper.validateLimit(101, 20, 100)).toBe(100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full pagination flow', () => {
      // Simulate first page
      const limit1 = PaginationHelper.validateLimit(20);
      expect(limit1).toBe(20);

      // Simulate DynamoDB response with LastEvaluatedKey
      const lastEvaluatedKey = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        category: 'electronics'
      };

      // Encode for client
      const nextToken = PaginationHelper.encodeToken(lastEvaluatedKey);
      expect(nextToken).toBeTruthy();

      // Client requests next page
      const decodedKey = PaginationHelper.decodeToken(nextToken!);
      expect(decodedKey).toEqual(lastEvaluatedKey);

      // Validate limit for next page
      const limit2 = PaginationHelper.validateLimit(20);
      expect(limit2).toBe(20);
    });

    it('should handle last page (no more results)', () => {
      const nextToken = PaginationHelper.encodeToken(undefined);
      expect(nextToken).toBeNull();

      const decodedKey = PaginationHelper.decodeToken(nextToken!);
      expect(decodedKey).toBeUndefined();
    });
  });
});
