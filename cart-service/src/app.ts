/**
 * Cart Service Application
 * 
 * Express application setup for Cart Service.
 * Replaces legacy CartServlet.java.
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { CartController } from './controllers/cart.controller';
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { logger } from './utils/logger.util';

export class App {
  public app: Application;
  private cartController: CartController;

  constructor() {
    this.app = express();
    this.cartController = new CartController();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(loggingMiddleware);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'cart-service',
        timestamp: new Date().toISOString(),
      });
    });

    // API v1 routes
    const router = express.Router();

    // All cart endpoints require authentication
    router.get('/cart', authMiddleware, this.cartController.getCart.bind(this.cartController));

    router.post(
      '/cart/items',
      authMiddleware,
      this.cartController.addCartItem.bind(this.cartController)
    );

    router.put(
      '/cart/items/:productId',
      authMiddleware,
      this.cartController.updateCartItem.bind(this.cartController)
    );

    router.delete(
      '/cart/items/:productId',
      authMiddleware,
      this.cartController.removeCartItem.bind(this.cartController)
    );

    router.delete(
      '/cart',
      authMiddleware,
      this.cartController.clearCart.bind(this.cartController)
    );

    this.app.use('/api/v1', router);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundMiddleware);

    // Error handler (must be last)
    this.app.use(errorMiddleware);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      logger.info(`Cart Service listening on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    });
  }
}
