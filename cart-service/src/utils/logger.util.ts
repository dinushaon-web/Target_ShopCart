/**
 * Logger Utility
 * 
 * Winston logger configuration for structured logging.
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: nodeEnv === 'production' ? logFormat : consoleFormat,
  }),
];

// Add CloudWatch transport in production
if (nodeEnv === 'production' && process.env.CLOUDWATCH_LOG_GROUP) {
  // CloudWatch transport would be configured here
  // Requires additional setup with aws-sdk
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

export default logger;
