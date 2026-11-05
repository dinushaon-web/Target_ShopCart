/**
 * DynamoDB Configuration
 * 
 * Configures AWS SDK DynamoDB client for product data access
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const REGION = process.env.AWS_REGION || 'us-east-1';

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: REGION,
  maxAttempts: 3
});

// Create DynamoDB Document client with marshalling options
export const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

export const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';

logger.info('DynamoDB configuration initialized', {
  region: REGION,
  productsTable: PRODUCTS_TABLE
});
