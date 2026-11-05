/**
 * Authentication Middleware
 * 
 * Validates JWT tokens from AWS Cognito
 * Replaces session-based authentication from legacy servlet
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

if (!COGNITO_USER_POOL_ID) {
  throw new Error('COGNITO_USER_POOL_ID environment variable is required');
}

const client = jwksClient({
  jwksUri: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    [key: string]: unknown;
  };
}

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Middleware to authenticate JWT Bearer tokens
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header', { 
      path: req.path,
      method: req.method 
    });
    throw new UnauthorizedError('Authentication token is required. Please provide a valid Bearer token.');
  }

  const token = authHeader.substring(7);

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      logger.warn('JWT verification failed', { 
        error: err.message,
        path: req.path 
      });
      throw new UnauthorizedError('The provided authentication token is invalid or has expired');
    }

    const payload = decoded as jwt.JwtPayload;

    req.user = {
      userId: payload.sub || '',
      email: payload.email,
      ...payload
    };

    logger.info('User authenticated', { 
      userId: req.user.userId,
      path: req.path 
    });

    next();
  });
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    await authenticateToken(req, res, next);
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}
