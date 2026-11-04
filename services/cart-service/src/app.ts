import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import logger from './utils/logger.util';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import cartRoutes from './routes/cart.routes';
import healthRoutes from './routes/health.routes';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  app.use('/health', healthRoutes);
  app.use('/ready', healthRoutes);
  app.use(`${config.api.basePath}/cart`, cartRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
