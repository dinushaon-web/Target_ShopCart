/**
 * Authentication Middleware
 * 
 * Validates AWS Cognito JWT tokens and extracts userId.
 * Replaces legacy session_id with OAuth 2.0 userId.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ProblemDetailsFactory } from '../models/problem-details.model';
import { logger } from '../utils/logger.util';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: any, callback: any): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const problem = ProblemDetailsFactory.unauthorized(req.path);
      res.status(401).json(problem);
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT with Cognito public keys
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      },
      (err, decoded: any) => {
        if (err) {
          logger.warn('Token verification failed', { error: err.message });
          const problem = ProblemDetailsFactory.unauthorized(req.path);
          res.status(401).json(problem);
          return;
        }

        // Attach user info to request
        // userId from JWT 'sub' claim replaces legacy session_id
        req.userId = decoded.sub;
        req.userEmail = decoded.email;

        logger.debug('User authenticated', { userId: req.userId });
        next();
      }
    );
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    const problem = ProblemDetailsFactory.unauthorized(req.path);
    res.status(401).json(problem);
  }
}
