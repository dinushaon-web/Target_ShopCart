/**
 * Cart Service Server Entry Point
 * 
 * Starts the Express server with graceful shutdown handling.
 */

import { App } from './app';
import { logger } from './utils/logger.util';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = new App();

// Start server
const server = app.app.listen(PORT, () => {
  logger.info(`Cart Service started successfully on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
