/**
 * Custom Error Classes
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

export class InsufficientStockError extends AppError {
  constructor(
    message: string,
    public readonly availableStock?: number,
    public readonly requestedQuantity?: number
  ) {
    super(
      message,
      409,
      'https://api.shopcart.com/errors/insufficient-stock'
    );
  }

  toProblemDetails(instance?: string): ProblemDetails {
    const details = super.toProblemDetails(instance);
    if (this.availableStock !== undefined) {
      details.availableStock = this.availableStock;
    }
    if (this.requestedQuantity !== undefined) {
      details.requestedQuantity = this.requestedQuantity;
    }
    return details;
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

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(
      message,
      503,
      'https://api.shopcart.com/errors/service-unavailable',
      true
    );
  }
}
