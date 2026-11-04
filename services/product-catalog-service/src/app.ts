/**
 * Express application setup
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import logger from './utils/logger.util';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import productRoutes from './routes/product.routes';
import healthRoutes from './routes/health.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  // Health check routes (no versioning)
  app.use('/health', healthRoutes);
  app.use('/ready', healthRoutes);

  // API routes with versioning
  app.use(`${config.api.basePath}/products`, productRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};
