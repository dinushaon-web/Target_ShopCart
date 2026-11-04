import { Request, Response } from 'express';
import { getDocumentClient } from '../config/dynamodb';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { getProductCatalogClient } from '../clients/product-catalog.client';
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

  readiness = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, HealthCheck> = {};

    checks.dynamodb = await this.checkDynamoDB();
    checks.productCatalogService = await this.checkProductCatalogService();

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

  private async checkDynamoDB(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const client = getDocumentClient();
      await client.send(
        new DescribeTableCommand({
          TableName: config.dynamodb.cartsTable,
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

  private async checkProductCatalogService(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const client = getProductCatalogClient();
      const status = client.getCircuitBreakerStatus();

      return {
        status: status.state === 'OPEN' ? 'DOWN' : 'UP',
        responseTime: Date.now() - start,
        circuitBreakerState: status.state,
      };
    } catch (error: any) {
      logger.error('Product Catalog Service health check failed', { error });
      return {
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }
}
