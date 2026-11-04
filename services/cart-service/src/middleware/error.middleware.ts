import { Request, Response, NextFunction } from 'express';
import { ProblemDetails } from '../models/api-response.model';
import logger from '../utils/logger.util';

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

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
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
