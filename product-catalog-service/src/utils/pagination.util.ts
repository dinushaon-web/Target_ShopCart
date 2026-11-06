import { ValidationError } from '../models/product.model';

/**
 * Pagination token structure for encoding/decoding DynamoDB LastEvaluatedKey
 */
export interface PaginationToken {
  lastEvaluatedKey: Record<string, any>;
}

/**
 * Helper class for cursor-based pagination
 * Encodes/decodes DynamoDB LastEvaluatedKey as base64 nextToken
 */
export class PaginationHelper {
  /**
   * Encode DynamoDB LastEvaluatedKey to base64 nextToken
   * @param lastEvaluatedKey - DynamoDB LastEvaluatedKey object
   * @returns Base64-encoded string or null if no key provided
   */
  static encodeToken(lastEvaluatedKey: Record<string, any> | undefined): string | null {
    if (!lastEvaluatedKey) return null;
    const json = JSON.stringify(lastEvaluatedKey);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decode base64 nextToken to DynamoDB LastEvaluatedKey
   * @param nextToken - Base64-encoded pagination token
   * @returns Decoded LastEvaluatedKey object or undefined
   * @throws ValidationError if token is malformed
   */
  static decodeToken(nextToken: string | undefined): Record<string, any> | undefined {
    if (!nextToken) return undefined;
    try {
      const json = Buffer.from(nextToken, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (error) {
      throw new ValidationError('Invalid pagination token');
    }
  }

  /**
   * Validate and cap limit parameter
   * @param limit - Requested limit
   * @param defaultLimit - Default limit if not provided (default: 20)
   * @param maxLimit - Maximum allowed limit (default: 100)
   * @returns Validated limit value
   */
  static validateLimit(limit: number | undefined, defaultLimit = 20, maxLimit = 100): number {
    if (!limit) return defaultLimit;
    if (limit < 1) return defaultLimit;
    if (limit > maxLimit) return maxLimit;
    return limit;
  }
}
