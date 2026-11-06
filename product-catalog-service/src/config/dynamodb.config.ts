import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export class DynamoDBConfig {
  private static client: DynamoDBDocumentClient;

  static getClient(): DynamoDBDocumentClient {
    if (!this.client) {
      const ddbClient = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        ...(process.env.DYNAMODB_ENDPOINT && {
          endpoint: process.env.DYNAMODB_ENDPOINT // For local testing
        })
      });

      this.client = DynamoDBDocumentClient.from(ddbClient, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertClassInstanceToMap: true
        },
        unmarshallOptions: {
          wrapNumbers: false
        }
      });
    }

    return this.client;
  }
}
