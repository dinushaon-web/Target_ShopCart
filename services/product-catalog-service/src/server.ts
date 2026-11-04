/**
 * Server entry point
 * Initializes dependencies and starts Express server
 */

import { createApp } from './app';
import { initializeDynamoDB } from './config/dynamodb';
import config from './config';
import logger from './utils/logger.util';

const startServer = async (): Promise<void> => {
  try {
    // Initialize DynamoDB client
    logger.info('Initializing DynamoDB client...');
    initializeDynamoDB();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.service.port, () => {
      logger.info(`${config.service.name} started`, {
        port: config.service.port,
        environment: config.service.env,
        version: config.service.version,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
