/**
 * Product Controller
 * 
 * HTTP request handlers for product endpoints
 * Replaces ProductServlet.java doGet() method
 */

import { Response } from 'express';
import { ProductService } from '../services/product.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * GET /api/v1/products
   * Retrieve all products with pagination
   */
  async getAllProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;

    logger.info('Get all products request', { limit, hasCursor: !!cursor });

    const result = await this.productService.getAllProducts(limit, cursor);

    res.status(200).json({
      data: result.products,
      cursor: result.cursor
    });
  }

  /**
   * GET /api/v1/products/:productId
   * Retrieve a single product by ID
   */
  async getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { productId } = req.params;

    logger.info('Get product by ID request', { productId });

    const product = await this.productService.getProductById(productId);

    res.status(200).json(product);
  }

  /**
   * PATCH /api/v1/products/:productId/stock
   * Decrement product stock (authenticated)
   */
  async decrementStock(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { productId } = req.params;
    const { quantity } = req.body;

    logger.info('Decrement stock request', { 
      productId, 
      quantity,
      userId: req.user?.userId 
    });

    const product = await this.productService.decrementStock(productId, quantity);

    res.status(200).json(product);
  }
}
