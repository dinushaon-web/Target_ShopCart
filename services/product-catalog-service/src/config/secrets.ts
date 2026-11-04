import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config from './index';
import logger from '../utils/logger.util';

interface CachedSecret {
  value: any;
  expiry: number;
}

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, CachedSecret> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = new SecretsManagerClient({
      region: config.aws.region,
    });
  }

  /**
   * Get secret from AWS Secrets Manager with caching
   * @param secretName - Name or ARN of the secret
   * @returns Parsed secret value
   */
  async getSecret<T = any>(secretName: string): Promise<T> {
    try {
      // Check cache first
      const cached = this.cache.get(secretName);
      if (cached && cached.expiry > Date.now()) {
        logger.debug(`Secret retrieved from cache: ${secretName}`);
        return cached.value;
      }

      // Fetch from Secrets Manager
      logger.info(`Fetching secret from AWS Secrets Manager: ${secretName}`);
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no SecretString value`);
      }

      const value = JSON.parse(response.SecretString);

      // Cache with TTL
      this.cache.set(secretName, {
        value,
        expiry: Date.now() + this.CACHE_TTL,
      });

      logger.info(`Secret fetched and cached: ${secretName}`);
      return value;
    } catch (error) {
      logger.error(`Failed to fetch secret: ${secretName}`, { error });
      throw error;
    }
  }

  /**
   * Clear cached secret
   * @param secretName - Name or ARN of the secret
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      this.cache.delete(secretName);
      logger.info(`Cache cleared for secret: ${secretName}`);
    } else {
      this.cache.clear();
      logger.info('All secrets cache cleared');
    }
  }
}

// Singleton instance
let secretsManagerInstance: SecretsManager;

export const getSecretsManager = (): SecretsManager => {
  if (!secretsManagerInstance) {
    secretsManagerInstance = new SecretsManager();
  }
  return secretsManagerInstance;
};
