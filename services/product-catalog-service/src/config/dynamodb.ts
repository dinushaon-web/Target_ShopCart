import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import config from './index';
import logger from '../utils/logger.util';

let dynamoDBClient: DynamoDBClient;
let documentClient: DynamoDBDocumentClient;

export const initializeDynamoDB = (): void => {
  try {
    const clientConfig: any = {
      region: config.aws.region,
    };

    // Use local endpoint for development
    if (config.dynamodb.endpoint) {
      clientConfig.endpoint = config.dynamodb.endpoint;
      logger.info(`DynamoDB client configured with local endpoint: ${config.dynamodb.endpoint}`);
    }

    dynamoDBClient = new DynamoDBClient(clientConfig);

    documentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    logger.info('DynamoDB client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize DynamoDB client', { error });
    throw error;
  }
};

export const getDynamoDBClient = (): DynamoDBClient => {
  if (!dynamoDBClient) {
    throw new Error('DynamoDB client not initialized. Call initializeDynamoDB() first.');
  }
  return dynamoDBClient;
};

export const getDocumentClient = (): DynamoDBDocumentClient => {
  if (!documentClient) {
    throw new Error('DynamoDB document client not initialized. Call initializeDynamoDB() first.');
  }
  return documentClient;
};
