/**
 * Cart Service Application
 * 
 * Main application entry point
 * Replaces CartServlet with Express.js REST API
 */

import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import cartRoutes from './routes/cart.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'cart-service',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/cart', cartRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).contentType('application/problem+json').json({
    type: 'https://api.shopcart.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: `The requested resource '${req.path}' was not found`,
    instance: req.originalUrl
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('Cart Service started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0'
    });
  });
}

export default app;
