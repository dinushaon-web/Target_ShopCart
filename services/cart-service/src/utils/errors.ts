/**
 * Custom Error Classes for Cart Service
 * 
 * Implements RFC 7807 Problem Details for HTTP APIs
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly type: string,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }

  protected getTitle(): string {
    return this.name.replace(/Error$/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.getTitle(),
      status: this.statusCode,
      detail: this.message,
      instance
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(
      message,
      404,
      'https://api.shopcart.com/errors/not-found'
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(
      message,
      400,
      'https://api.shopcart.com/errors/validation-error'
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(
      message,
      401,
      'https://api.shopcart.com/errors/unauthorized'
    );
  }
}
