/**
 * Error handling middleware following RFC 7807 Problem Details format
 * Replaces legacy PrintWriter JSON serialization from ProductServlet
 */

import { Request, Response, NextFunction } from 'express';
import { ProblemDetails } from '../models/api-response.model';
import logger from '../utils/logger.util';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly type: string,
    public readonly title: string,
    message: string,
    public readonly additionalFields?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Product not found error (404)
 */
export class ProductNotFoundError extends AppError {
  constructor(message: string, productId?: string) {
    super(
      404,
      'https://api.shopcart.com/errors/resource-not-found',
      'Resource Not Found',
      message,
      productId ? { productId } : undefined
    );
  }
}

/**
 * Insufficient stock error (409)
 */
export class InsufficientStockError extends AppError {
  constructor(message: string, currentStock?: number, requestedQuantity?: number) {
    super(
      409,
      'https://api.shopcart.com/errors/insufficient-stock',
      'Insufficient Stock',
      message,
      {
        currentStock,
        requestedQuantity,
      }
    );
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, errors?: Array<{ field: string; message: string; rejectedValue?: any }>) {
    super(
      400,
      'https://api.shopcart.com/errors/validation-failed',
      'Validation Failed',
      message,
      errors ? { errors } : undefined
    );
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(
      401,
      'https://api.shopcart.com/errors/unauthorized',
      'Unauthorized',
      message
    );
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(
      403,
      'https://api.shopcart.com/errors/forbidden',
      'Forbidden',
      message
    );
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(
      503,
      'https://api.shopcart.com/errors/service-unavailable',
      'Service Unavailable',
      message,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  // Get X-Ray trace ID if available
  const traceId = process.env._X_AMZN_TRACE_ID || req.headers['x-amzn-trace-id'] as string;

  if (err instanceof AppError) {
    const problemDetails: ProblemDetails = {
      type: err.type,
      title: err.title,
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
      traceId,
      ...err.additionalFields,
    };

    logger.warn('Application error', {
      error: err.message,
      statusCode: err.statusCode,
      path: req.originalUrl,
      traceId,
    });

    res.status(err.statusCode).json(problemDetails);
  } else {
    // Unhandled errors - return 500
    const problemDetails: ProblemDetails = {
      type: 'https://api.shopcart.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
      traceId,
    };

    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.originalUrl,
      traceId,
    });

    res.status(500).json(problemDetails);
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const traceId = process.env._X_AMZN_TRACE_ID || req.headers['x-amzn-trace-id'] as string;

  const problemDetails: ProblemDetails = {
    type: 'https://api.shopcart.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: `The requested resource ${req.originalUrl} was not found`,
    instance: req.originalUrl,
    timestamp: new Date().toISOString(),
    traceId,
  };

  logger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    traceId,
  });

  res.status(404).json(problemDetails);
};
