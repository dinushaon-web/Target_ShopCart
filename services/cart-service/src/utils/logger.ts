/**
 * Structured Logger using Winston for Cart Service
 * 
 * Provides JSON-formatted logging for CloudWatch integration
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'cart-service',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      )
    })
  ]
});

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: unknown[]) => logger.info(args.join(' '));
  console.error = (...args: unknown[]) => logger.error(args.join(' '));
  console.warn = (...args: unknown[]) => logger.warn(args.join(' '));
  console.info = (...args: unknown[]) => logger.info(args.join(' '));
}
