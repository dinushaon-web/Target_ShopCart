/**
 * Error Handling Middleware for Cart Service
 * 
 * Implements RFC 7807 Problem Details for HTTP APIs
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err instanceof AppError ? err.statusCode : 500
  });

  if (err instanceof AppError && err.isOperational) {
    res
      .status(err.statusCode)
      .contentType('application/problem+json')
      .json(err.toProblemDetails(req.originalUrl));
    return;
  }

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

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
