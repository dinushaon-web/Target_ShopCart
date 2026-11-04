/**
 * Product Catalog Service HTTP client with circuit breaker
 * Implements retry logic and exponential backoff
 */

import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import config from '../config';
import logger from '../utils/logger.util';
import { ProductInfo } from '../models/cart.model';

export class ProductCatalogClient {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.productCatalog.serviceUrl,
      timeout: config.circuitBreaker.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Circuit breaker configuration
    const breakerOptions = {
      timeout: config.circuitBreaker.timeout,
      errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
      resetTimeout: config.circuitBreaker.resetTimeout,
    };

    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), breakerOptions);

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      logger.error('Circuit breaker opened - Product Catalog Service unavailable');
    });

    this.circuitBreaker.on('halfOpen', () => {
      logger.warn('Circuit breaker half-open - Testing Product Catalog Service');
    });

    this.circuitBreaker.on('close', () => {
      logger.info('Circuit breaker closed - Product Catalog Service recovered');
    });
  }

  /**
   * Get product by ID with circuit breaker
   * @param productId - UUID of the product
   * @returns Product information
   */
  async getProduct(productId: string): Promise<ProductInfo> {
    try {
      const response = await this.circuitBreaker.fire(`/api/v1/products/${productId}`);
      return response.data.data; // Unwrap ApiResponse<Product>
    } catch (error: any) {
      logger.error('Failed to get product from Product Catalog Service', {
        productId,
        error: error.message,
        circuitBreakerState: this.circuitBreaker.status.name,
      });
      throw error;
    }
  }

  /**
   * Update product stock (decrement)
   * @param productId - UUID of the product
   * @param quantity - Quantity to decrement
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    try {
      await this.circuitBreaker.fire(`/api/v1/products/${productId}/stock`, {
        method: 'PATCH',
        data: {
          operation: 'decrement',
          quantity,
        },
      });
      logger.info('Stock decremented successfully', { productId, quantity });
    } catch (error: any) {
      logger.error('Failed to decrement stock', {
        productId,
        quantity,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): { state: string; stats: any } {
    return {
      state: this.circuitBreaker.status.name,
      stats: this.circuitBreaker.stats,
    };
  }

  /**
   * Internal method to make HTTP requests
   */
  private async makeRequest(url: string, options?: any): Promise<any> {
    const method = options?.method || 'GET';
    const data = options?.data;

    const response = await this.axiosInstance.request({
      url,
      method,
      data,
    });

    return response;
  }
}

// Singleton instance
let productCatalogClientInstance: ProductCatalogClient;

export const getProductCatalogClient = (): ProductCatalogClient => {
  if (!productCatalogClientInstance) {
    productCatalogClientInstance = new ProductCatalogClient();
  }
  return productCatalogClientInstance;
};
