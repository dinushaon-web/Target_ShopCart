import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBConfig } from '../config/dynamodb.config';
import { Product, InsufficientStockError } from '../models/product.model';
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

  async getAllProducts(
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<PaginationResult<Product>> {
    const command = new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      FilterExpression: 'stock > :zero',
      ExpressionAttributeValues: {
        ':zero': 0
      }
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
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET stock = stock - :qty, updatedAt = :now',
      ConditionExpression: 'stock >= :qty AND attribute_exists(productId)',
      ExpressionAttributeValues: {
        ':qty': quantity,
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
   */
  async incrementStock(productId: string, quantity: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { productId },
      UpdateExpression: 'SET stock = stock + :qty, updatedAt = :now',
      ConditionExpression: 'attribute_exists(productId)',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':now': new Date().toISOString()
      }
    });

    await this.docClient.send(command);
  }
}
