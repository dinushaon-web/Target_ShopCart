/**
 * Error Handling Middleware
 * 
 * Implements RFC 7807 Problem Details for HTTP APIs
 * Replaces legacy PrintWriter JSON serialization from servlets
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with full stack trace
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err instanceof AppError ? err.statusCode : 500
  });

  // Handle operational errors (expected errors)
  if (err instanceof AppError && err.isOperational) {
    res
      .status(err.statusCode)
      .contentType('application/problem+json')
      .json(err.toProblemDetails(req.originalUrl));
    return;
  }

  // Handle unexpected errors (programmer errors)
  res
    .status(500)
    .contentType('application/problem+json')
    .json({
      type: 'https://api.shopcart.com/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: req.originalUrl
    });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
