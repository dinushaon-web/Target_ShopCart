/**
 * Request validation middleware using Zod
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from './error.middleware';
import { ProductCategory } from '../models/product.model';

/**
 * Zod schemas for request validation
 */
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  price: z.number().positive().min(0.01),
  stock: z.number().int().min(0),
  category: z.nativeEnum(ProductCategory),
  imageUrl: z.string().url().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().min(0.01).optional(),
  stock: z.number().int().min(0).optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const stockUpdateSchema = z.object({
  operation: z.enum(['increment', 'decrement', 'set']),
  quantity: z.number().int().positive().min(1),
});

export const productFiltersSchema = z.object({
  category: z.nativeEnum(ProductCategory).optional(),
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  cursor: z.string().optional(),
});

export const uuidSchema = z.string().uuid();

/**
 * Generic validation middleware factory
 */
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);
      
      // Replace request data with validated data
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rejectedValue: err.code === 'invalid_type' ? undefined : err,
        }));
        
        next(new ValidationError('Request validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};
