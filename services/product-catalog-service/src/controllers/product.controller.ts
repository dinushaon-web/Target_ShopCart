/**
 * Product Controller - HTTP request handling layer
 * Replaces legacy ProductServlet.doGet() with Express.js REST endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilters,
  StockUpdateRequest,
} from '../models/product.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import config from '../config';
import logger from '../utils/logger.util';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * List all products with pagination and filtering
   * GET /api/v1/products
   */
  listProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: ProductFilters = req.query as any;

      const result = await this.productService.getAllProducts(filters);

      const response: PaginatedResponse<any> = {
        items: result.items,
        pagination: {
          limit: filters.limit || config.pagination.defaultPageSize,
          nextCursor: result.nextCursor,
          hasMore: !!result.nextCursor,
        },
      };

      logger.info('Products listed', {
        count: result.items.length,
        hasMore: !!result.nextCursor,
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product by ID
   * GET /api/v1/products/:productId
   */
  getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;

      const product = await this.productService.getProductById(productId);

      const response: ApiResponse<any> = {
        data: product,
      };

      logger.info('Product retrieved', { productId });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new product
   * POST /api/v1/products
   */
  createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: CreateProductDTO = req.body;

      const product = await this.productService.createProduct(dto);

      const response: ApiResponse<any> = {
        data: product,
      };

      logger.info('Product created', { productId: product.productId });

      res
        .status(201)
        .location(`${config.api.basePath}/products/${product.productId}`)
        .json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product
   * PUT /api/v1/products/:productId
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;
      const dto: UpdateProductDTO = req.body;

      const product = await this.productService.updateProduct(productId, dto);

      const response: ApiResponse<any> = {
        data: product,
      };

      logger.info('Product updated', { productId });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete product (soft delete)
   * DELETE /api/v1/products/:productId
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;

      await this.productService.deleteProduct(productId);

      logger.info('Product deleted', { productId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product stock atomically
   * PATCH /api/v1/products/:productId/stock
   */
  updateStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;
      const request: StockUpdateRequest = req.body;

      const result = await this.productService.updateStock(productId, request);

      const response: ApiResponse<any> = {
        data: result,
      };

      logger.info('Stock updated', { productId, operation: request.operation });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
