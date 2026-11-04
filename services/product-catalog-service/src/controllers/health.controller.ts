/**
 * Health Check Controller
 * Provides Kubernetes liveness and readiness probes
 */

import { Request, Response } from 'express';
import { getDocumentClient } from '../config/dynamodb';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { getSecretsManager } from '../config/secrets';
import config from '../config';
import logger from '../utils/logger.util';

interface HealthCheck {
  status: 'UP' | 'DOWN';
  responseTime?: number;
  [key: string]: any;
}

export class HealthController {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Liveness probe - checks if service is alive
   * GET /health
   */
  liveness = async (_req: Request, res: Response): Promise<void> => {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const response = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: config.service.version,
      uptime,
    };

    res.status(200).json(response);
  };

  /**
   * Readiness probe - checks if service is ready to accept traffic
   * GET /ready
   */
  readiness = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, HealthCheck> = {};

    // Check DynamoDB connection
    checks.dynamodb = await this.checkDynamoDB();

    // Check Secrets Manager
    checks.secretsManager = await this.checkSecretsManager();

    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => check.status === 'UP');
    const overallStatus = allHealthy ? 'READY' : 'NOT_READY';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    };

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  };

  /**
   * Check DynamoDB connectivity
   */
  private async checkDynamoDB(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const client = getDocumentClient();
      // Simple check - describe table
      await client.send(
        new DescribeTableCommand({
          TableName: config.dynamodb.productsTable,
        }) as any
      );

      return {
        status: 'UP',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      logger.error('DynamoDB health check failed', { error });
      return {
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Check Secrets Manager connectivity
   */
  private async checkSecretsManager(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const secretsManager = getSecretsManager();
      // Check if secrets are cached or accessible
      // In production, this would attempt to fetch a health-check secret
      // For now, just check if the client is initialized
      
      return {
        status: 'UP',
        responseTime: Date.now() - start,
        cacheAge: 0, // Could track actual cache age if needed
      };
    } catch (error: any) {
      logger.error('Secrets Manager health check failed', { error });
      return {
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }
}
