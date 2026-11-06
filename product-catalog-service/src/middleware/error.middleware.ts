import { Request, Response, NextFunction } from 'express';
import { ProblemDetailsFactory, ProblemDetails } from '../models/problem-details.model';
import { ValidationError, InsufficientStockError } from '../models/product.model';
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
    method: req.method
  });

  let problem: ProblemDetails;

  if (error instanceof ValidationError) {
    problem = ProblemDetailsFactory.validationError(error.message, req.path);
  } else if (error instanceof InsufficientStockError) {
    problem = ProblemDetailsFactory.insufficientStock(
      req.params.productId || 'unknown',
      req.path
    );
  } else if (error.name === 'UnauthorizedError') {
    problem = ProblemDetailsFactory.unauthorized(req.path);
  } else if (error.name === 'ConditionalCheckFailedException') {
    // DynamoDB conditional check failed (e.g., product doesn't exist)
    problem = ProblemDetailsFactory.notFound(
      'Product',
      req.params.productId || 'unknown',
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
