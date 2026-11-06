import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { GetAllProductsParams } from '../repositories/product.repository';
import { ProblemDetailsFactory } from '../models/problem-details.model';
import { logger } from '../utils/logger.util';
import { NotFoundError } from '../models/product.model';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * GET /api/v1/products
   * List all products with pagination, filtering, and sorting
   * Implements AC1, AC2, AC3, AC9
   */
  async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: GetAllProductsParams = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        nextToken: req.query.nextToken as string | undefined,
        category: req.query.category as string | undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
        sortBy: req.query.sortBy as 'price' | 'name' | 'popularity' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await this.productService.getAllProducts(params);

      // OpenAPI 3.0 compliant response
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/products/:id
   * Get a single product by ID
   * Implements AC4, AC10 (RFC 7807 error for 404)
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const product = await this.productService.getProductById(productId);

      res.status(200).json(product);
    } catch (error) {
      // NotFoundError will be handled by error middleware with RFC 7807 format
      next(error);
    }
  }

  /**
   * GET /api/v1/products/category/:category
   * Get products by category
   */
  async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;

      const lastEvaluatedKey = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined;

      const result = await this.productService.getProductsByCategory(category, limit, lastEvaluatedKey);

      const nextCursor = result.lastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
        : undefined;

      res.status(200).json({
        data: result.items,
        pagination: {
          limit,
          cursor: nextCursor
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products
   * Create a new product (admin only)
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productData = req.body;
      const product = await this.productService.createProduct(productData);

      logger.info(`Product created: ${product.productId}`, { product });

      res.status(201).json({ data: product });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/products/:productId
   * Update an existing product (admin only)
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const updates = req.body;

      const product = await this.productService.updateProduct(productId, updates);

      logger.info(`Product updated: ${productId}`, { updates });

      res.status(200).json({ data: product });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:productId
   * Delete a product (admin only)
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      await this.productService.deleteProduct(productId);

      logger.info(`Product deleted: ${productId}`);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:productId/decrement-stock
   * Decrement product stock (internal/service-to-service)
   * Replaces sp_decrement_stock stored procedure
   */
  async decrementStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        const problem = ProblemDetailsFactory.validationError(
          'Quantity must be greater than 0',
          req.path
        );
        res.status(400).json(problem);
        return;
      }

      await this.productService.decrementStock(productId, quantity);

      logger.info(`Stock decremented for product ${productId}`, { quantity });

      res.status(200).json({
        message: 'Stock decremented successfully',
        productId,
        quantity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:productId/increment-stock
   * Increment product stock (for returns/restocking)
   */
  async incrementStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        const problem = ProblemDetailsFactory.validationError(
          'Quantity must be greater than 0',
          req.path
        );
        res.status(400).json(problem);
        return;
      }

      await this.productService.incrementStock(productId, quantity);

      logger.info(`Stock incremented for product ${productId}`, { quantity });

      res.status(200).json({
        message: 'Stock incremented successfully',
        productId,
        quantity
      });
    } catch (error) {
      next(error);
    }
  }
}
