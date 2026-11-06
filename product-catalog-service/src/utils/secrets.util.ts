import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';
import { logger } from './logger.util';

interface CachedSecret {
  value: any;
  expiry: number;
}

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, CachedSecret>;
  private cacheTTL: number;

  constructor(cacheTTL: number = 5 * 60 * 1000) { // Default 5 minutes
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
  }

  async getSecret(secretName: string): Promise<any> {
    // Check cache
    const cached = this.cache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
      logger.debug(`Retrieved secret ${secretName} from cache`);
      return cached.value;
    }

    try {
      logger.info(`Fetching secret ${secretName} from AWS Secrets Manager`);
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      const secretValue = response.SecretString
        ? JSON.parse(response.SecretString)
        : response.SecretBinary;

      // Cache the secret
      this.cache.set(secretName, {
        value: secretValue,
        expiry: Date.now() + this.cacheTTL
      });

      return secretValue;
    } catch (error: any) {
      logger.error(`Failed to retrieve secret ${secretName}`, { error: error.message });
      throw new Error(`Failed to retrieve secret ${secretName}: ${error.message}`);
    }
  }

  async getPayPalAPIKey(): Promise<string> {
    const secrets = await this.getSecret('payment-gateway-credentials');
    return secrets.paypal_api_key;
  }

  async getDatabaseCredentials(): Promise<{ username: string; password: string }> {
    // Note: DynamoDB uses IAM roles, so this is for legacy compatibility only
    const secrets = await this.getSecret('database-credentials');
    return {
      username: secrets.username,
      password: secrets.password
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Secrets cache cleared');
  }
}

// Singleton instance
export const secretsManager = new SecretsManager();
