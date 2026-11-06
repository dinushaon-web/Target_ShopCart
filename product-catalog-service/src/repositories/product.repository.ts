import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBConfig } from '../config/dynamodb.config';
import { Product, InsufficientStockError, ValidationError } from '../models/product.model';
import { PaginationHelper } from '../utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

/**
 * Query parameters for getAllProducts with filtering and sorting
 */
export interface GetAllProductsParams {
  limit?: number;           // Default 20, max 100
  nextToken?: string;       // Base64-encoded cursor
  category?: string;        // Exact match filter
  minPrice?: number;        // Price >= minPrice
  maxPrice?: number;        // Price <= maxPrice
  inStock?: boolean;        // Filter by inStock boolean
  sortBy?: 'price' | 'name' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response structure for getAllProducts
 */
export interface GetAllProductsResponse {
  products: Product[];
  pagination: {
    limit: number;
    nextToken: string | null;
    hasMore: boolean;
  };
}

export interface PaginationResult<T> {
  items: T[];
  lastEvaluatedKey?: any;
}

export class ProductRepository {
  private docClient = DynamoDBConfig.getClient();
  private tableName: string;

  constructor() {
    this.tableName = process.env.PRODUCTS_TABLE_NAME || 'products';
  }

  /**
   * Get all products with pagination, filtering, and sorting
   * Implements AC1, AC2, AC3
   */
  async getAllProducts(params: GetAllProductsParams): Promise<GetAllProductsResponse> {
    const limit = PaginationHelper.validateLimit(params.limit);
    const lastEvaluatedKey = PaginationHelper.decodeToken(params.nextToken);

    // Build FilterExpression
    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Filter: category (exact match)
    if (params.category) {
      filterExpressions.push('category = :category');
      expressionAttributeValues[':category'] = params.category;
    }

    // Filter: minPrice
    if (params.minPrice !== undefined) {
      filterExpressions.push('price >= :minPrice');
      expressionAttributeValues[':minPrice'] = params.minPrice;
    }

    // Filter: maxPrice
    if (params.maxPrice !== undefined) {
      filterExpressions.push('price <= :maxPrice');
      expressionAttributeValues[':maxPrice'] = params.maxPrice;
    }

    // Filter: inStock
    if (params.inStock !== undefined) {
      filterExpressions.push('inStock = :inStock');
      expressionAttributeValues[':inStock'] = params.inStock;
    }

    // Determine if we need to use Query (with GSI) or Scan
    let command;
    if (params.sortBy) {
      // Use GSI for sorting
      const indexName = this.getIndexNameForSort(params.sortBy);
      
      // For GSI queries, we need a partition key. If category filter is provided, use it.
      // Otherwise, we cannot use GSI and must fall back to Scan with in-memory sort.
      if (params.category) {
        command = new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: 'category = :category',
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: params.sortOrder !== 'desc',
          FilterExpression: filterExpressions.length > 1 ? filterExpressions.slice(1).join(' AND ') : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        });
      } else {
        // Fallback: Scan with in-memory sorting (performance warning)
        console.warn('Sorting without category filter requires Scan operation. Consider using category filter for better performance.');
        command = new ScanCommand({
          TableName: this.tableName,
          Limit: limit * 2, // Fetch more for sorting
          ExclusiveStartKey: lastEvaluatedKey,
          FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
          ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        });
      }
    } else {
      // Use Scan for unordered results
      command = new ScanCommand({
        TableName: this.tableName,
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      });
    }

    const result = await this.docClient.send(command);
    let products = (result.Items as Product[]) || [];

    // In-memory sorting if needed (when using Scan with sortBy)
    if (params.sortBy && !params.category) {
      products = this.sortProductsInMemory(products, params.sortBy, params.sortOrder);
      products = products.slice(0, limit); // Apply limit after sorting
    }

    const encodedNextToken = PaginationHelper.encodeToken(result.LastEvaluatedKey);

    return {
      products,
      pagination: {
        limit,
        nextToken: encodedNextToken,
        hasMore: !!result.LastEvaluatedKey,
      },
    };
  }

  /**
   * Get index name based on sortBy parameter
   * Assumes GSIs exist: price-index, name-index, popularity-index
   */
  private getIndexNameForSort(sortBy: string): string {
    switch (sortBy) {
      case 'price':
        return 'price-index';       // GSI: category (PK) + price (SK)
      case 'name':
        return 'name-index';        // GSI: category (PK) + name (SK)
      case 'popularity':
        return 'popularity-index';  // GSI: category (PK) + popularity (SK)
      default:
        throw new ValidationError(`Invalid sortBy parameter: ${sortBy}`);
    }
  }

  /**
   * In-memory sorting fallback when GSI cannot be used
   */
  private sortProductsInMemory(
    products: Product[],
    sortBy: 'price' | 'name' | 'popularity',
    sortOrder?: 'asc' | 'desc'
  ): Product[] {
    const sorted = [...products].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }

  async getProductById(productId: string): Promise<Product | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { productId }
    });

    const result = await this.docClient.send(command);
    return (result.Item as Product) || null;
  }

  async getProductsByCategory(
    category: string,
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<PaginationResult<Product>> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const result = await this.docClient.send(command);
    return {
      items: (result.Items as Product[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  async createProduct(product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      productId: uuidv4(),
      inStock: product.stockQuantity > 0,
      popularity: product.popularity || 0,
      createdAt: now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: newProduct,
      ConditionExpression: 'attribute_not_exists(productId)'
    });

    await this.docClient.send(command);
    return newProduct;
  }

  async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, 'productId' | 'createdAt'>>
  ): Promise<Product> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'productId' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    // Update inStock based on stockQuantity if stockQuantity is being updated
    if (updates.stockQuantity !== undefined) {
      updateExpressions.push('#inStock = :inStock');
      expressionAttributeNames['#inStock'] = 'inStock';
      expressionAttributeValues[':inStock'] = updates.stockQuantity > 0;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(productId)',
      ReturnValues: 'ALL_NEW'
    });

    const result = await this.docClient.send(command);
    return result.Attributes as Product;
  }

  async deleteProduct(productId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { productId },
      ConditionExpression: 'attribute_exists(productId)'
    });

    await this.docClient.send(command);
  }

  /**
   * Replaces sp_decrement_stock stored procedure with DynamoDB conditional write
   * Atomically decrements stockQuantity and updates inStock flag
   * Implements AC8 (handled by Inventory Service, but kept for backward compatibility)
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET stockQuantity = stockQuantity - :qty, inStock = if_not_exists(stockQuantity - :qty > :zero, :false, :true), updatedAt = :now',
      ConditionExpression: 'stockQuantity >= :qty AND attribute_exists(productId)',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':zero': 0,
        ':true': true,
        ':false': false,
        ':now': new Date().toISOString()
      }
    });

    try {
      await this.docClient.send(command);
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new InsufficientStockError(
          `Insufficient stock for product ${productId}. Requested: ${quantity}`
        );
      }
      throw error;
    }
  }

  /**
   * Increment stockQuantity (for returns or restocking)
   */
  async incrementStock(productId: string, quantity: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET stockQuantity = stockQuantity + :qty, inStock = :true, updatedAt = :now',
      ConditionExpression: 'attribute_exists(productId)',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':true': true,
        ':now': new Date().toISOString()
      }
    });

    await this.docClient.send(command);
  }
}
