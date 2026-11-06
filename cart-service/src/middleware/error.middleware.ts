/**
 * Error Handling Middleware
 * 
 * Converts exceptions to RFC 7807 Problem Details responses.
 * Replaces legacy servlet error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { ProblemDetailsFactory, ProblemDetails } from '../models/problem-details.model';
import {
  ValidationError,
  CartItemNotFoundError,
  InsufficientStockError,
} from '../models/cart.model';
import { logger } from '../utils/logger.util';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  let problem: ProblemDetails;

  if (error instanceof ValidationError) {
    problem = ProblemDetailsFactory.validationError(error.message, req.path);
  } else if (error instanceof CartItemNotFoundError) {
    problem = ProblemDetailsFactory.notFound(
      'Cart Item',
      req.params.productId || 'unknown',
      req.path
    );
  } else if (error instanceof InsufficientStockError) {
    problem = ProblemDetailsFactory.insufficientStock(
      error.productId,
      req.path,
      error.requestedQuantity,
      error.availableStock
    );
  } else if (error.name === 'UnauthorizedError') {
    problem = ProblemDetailsFactory.unauthorized(req.path);
  } else if (error.name === 'ConditionalCheckFailedException') {
    // DynamoDB conditional check failed
    problem = ProblemDetailsFactory.conflict(
      'Concurrent update conflict. Please retry.',
      req.path
    );
  } else {
    // Generic internal server error
    problem = ProblemDetailsFactory.internalError(req.path);
  }

  res.status(problem.status).json(problem);
}

export function notFoundMiddleware(req: Request, res: Response): void {
  const problem = ProblemDetailsFactory.create(
    'not-found',
    'Endpoint Not Found',
    404,
    `The endpoint ${req.method} ${req.path} does not exist`,
    req.path
  );
  res.status(404).json(problem);
}
