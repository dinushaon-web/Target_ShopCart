/**
 * Logging Middleware
 * 
 * Logs HTTP requests and responses with timing information.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.userId || 'anonymous',
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
    });
  });

  next();
}
