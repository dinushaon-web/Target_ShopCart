import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBConfig } from '../config/dynamodb.config';
import { Product, InsufficientStockError, ProductListQueryParams } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';

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
   * Query products with advanced filtering and sorting
   * Uses appropriate GSI based on query parameters
   */
  async queryProducts(
    params: ProductListQueryParams,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<PaginationResult<Product>> {
    const limit = Math.min(params.limit || 20, 100);

    // Determine query strategy based on filters
    if (params.category) {
      return this.queryByCategory(params, lastEvaluatedKey);
    } else if (params.inStock !== undefined) {
      return this.queryByStockStatus(params, lastEvaluatedKey);
    } else {
      return this.scanWithFilters(params, lastEvaluatedKey);
    }
  }

  /**
   * Query using category-price-index GSI
   * Best performance for category-based queries
   */
  private async queryByCategory(
    params: ProductListQueryParams,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<PaginationResult<Product>> {
    const queryParams: any = {
      TableName: this.tableName,
      IndexName: 'category-price-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': params.category
      },
      Limit: params.limit || 20,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: params.order === 'asc'
    };

    // Add price range filter
    const filterExpressions: string[] = [];
    if (params.minPrice !== undefined) {
      queryParams.ExpressionAttributeValues[':minPrice'] = params.minPrice;
      filterExpressions.push('price >= :minPrice');
    }
    if (params.maxPrice !== undefined) {
      queryParams.ExpressionAttributeValues[':maxPrice'] = params.maxPrice;
      filterExpressions.push('price <= :maxPrice');
    }
    if (params.inStock !== undefined) {
      queryParams.ExpressionAttributeValues[':inStock'] = params.inStock;
      filterExpressions.push('inStock = :inStock');
    }

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    const result = await this.docClient.send(new QueryCommand(queryParams));
    return {
      items: (result.Items as Product[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  /**
   * Query using inStock-createdAt-index GSI
   * Good performance for stock-based queries
   */
  private async queryByStockStatus(
    params: ProductListQueryParams,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<PaginationResult<Product>> {
    const queryParams: any = {
      TableName: this.tableName,
      IndexName: 'inStock-createdAt-index',
      KeyConditionExpression: 'inStock = :inStock',
      ExpressionAttributeValues: {
        ':inStock': params.inStock
      },
      Limit: params.limit || 20,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: params.order === 'asc'
    };

    // Add additional filters
    const filterExpressions: string[] = [];
    if (params.minPrice !== undefined) {
      queryParams.ExpressionAttributeValues[':minPrice'] = params.minPrice;
      filterExpressions.push('price >= :minPrice');
    }
    if (params.maxPrice !== undefined) {
      queryParams.ExpressionAttributeValues[':maxPrice'] = params.maxPrice;
      filterExpressions.push('price <= :maxPrice');
    }

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    const result = await this.docClient.send(new QueryCommand(queryParams));
    return {
      items: (result.Items as Product[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  /**
   * Scan with filters (fallback for complex queries)
   * Lower performance - use GSI queries when possible
   */
  private async scanWithFilters(
    params: ProductListQueryParams,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<PaginationResult<Product>> {
    const scanParams: any = {
      TableName: this.tableName,
      Limit: params.limit || 20,
      ExclusiveStartKey: lastEvaluatedKey
    };

    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (params.minPrice !== undefined) {
      expressionAttributeValues[':minPrice'] = params.minPrice;
      filterExpressions.push('price >= :minPrice');
    }
    if (params.maxPrice !== undefined) {
      expressionAttributeValues[':maxPrice'] = params.maxPrice;
      filterExpressions.push('price <= :maxPrice');
    }
    if (params.inStock !== undefined) {
      expressionAttributeValues[':inStock'] = params.inStock;
      filterExpressions.push('inStock = :inStock');
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    const result = await this.docClient.send(new ScanCommand(scanParams));
    let items = (result.Items as Product[]) || [];

    // Apply sorting (since Scan doesn't support ScanIndexForward)
    if (params.sortBy) {
      items = this.sortProducts(items, params.sortBy, params.order || 'desc');
    }

    return {
      items,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  /**
   * Sort products in memory
   * Used when GSI sorting is not available
   */
  private sortProducts(products: Product[], sortBy: string, order: 'asc' | 'desc'): Product[] {
    return products.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Get all products (legacy method - deprecated)
   * Use queryProducts() instead for better performance
   */
  async getAllProducts(
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<PaginationResult<Product>> {
    const command = new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const result = await this.docClient.send(command);
    return {
      items: (result.Items as Product[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
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
      IndexName: 'category-price-index',
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
      currency: product.currency || 'USD',
      category: product.category || 'General',
      imageUrl: product.imageUrl || null,
      inStock: product.stockQuantity > 0,
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

    // Compute inStock if stockQuantity is being updated
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
   * Atomically decrements stock and prevents negative values
   * Also updates inStock computed field
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET stockQuantity = stockQuantity - :qty, inStock = if_not_exists(stockQuantity, :zero) - :qty > :zero, updatedAt = :now',
      ConditionExpression: 'stockQuantity >= :qty AND attribute_exists(productId)',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':zero': 0,
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
   * Increment stock (for returns or restocking)
   * Also updates inStock computed field
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
