import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ProductController } from './controllers/product.controller';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { logger } from './utils/logger.util';

export class App {
  public app: Application;
  private productController: ProductController;

  constructor() {
    this.app = express();
    this.productController = new ProductController();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

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
        service: 'product-catalog',
        timestamp: new Date().toISOString()
      });
    });

    // API v1 routes
    const router = express.Router();

    // Public endpoints (no authentication required)
    router.get(
      '/products',
      this.productController.getAllProducts.bind(this.productController)
    );

    router.get(
      '/products/:productId',
      this.productController.getProductById.bind(this.productController)
    );

    router.get(
      '/products/category/:category',
      this.productController.getProductsByCategory.bind(this.productController)
    );

    // Protected endpoints (require authentication)
    router.post(
      '/products',
      authMiddleware,
      this.productController.createProduct.bind(this.productController)
    );

    router.put(
      '/products/:productId',
      authMiddleware,
      this.productController.updateProduct.bind(this.productController)
    );

    router.delete(
      '/products/:productId',
      authMiddleware,
      this.productController.deleteProduct.bind(this.productController)
    );

    // Internal/service-to-service endpoints (require authentication)
    router.post(
      '/products/:productId/decrement-stock',
      authMiddleware,
      this.productController.decrementStock.bind(this.productController)
    );

    router.post(
      '/products/:productId/increment-stock',
      authMiddleware,
      this.productController.incrementStock.bind(this.productController)
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
      logger.info(`Product Catalog Service listening on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    });
  }
}
