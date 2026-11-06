/**
 * RFC 7807 Problem Details Model
 * 
 * Standard error response format for HTTP APIs.
 * Replaces legacy servlet JSON error responses.
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  correlationId?: string;
  extensions?: Record<string, any>;
}

export class ProblemDetailsFactory {
  private static readonly BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';

  static create(
    type: string,
    title: string,
    status: number,
    detail: string,
    instance: string,
    extensions?: Record<string, any>
  ): ProblemDetails {
    return {
      type: `${this.BASE_URL}/errors/${type}`,
      title,
      status,
      detail,
      instance,
      timestamp: new Date().toISOString(),
      extensions,
    };
  }

  static validationError(detail: string, instance: string): ProblemDetails {
    return this.create('validation-error', 'Validation Error', 400, detail, instance);
  }

  static unauthorized(instance: string): ProblemDetails {
    return this.create(
      'unauthorized',
      'Unauthorized',
      401,
      'Missing or invalid JWT token. Please authenticate.',
      instance
    );
  }

  static notFound(resourceType: string, resourceId: string, instance: string): ProblemDetails {
    return this.create(
      'not-found',
      'Resource Not Found',
      404,
      `${resourceType} with ID '${resourceId}' not found`,
      instance
    );
  }

  static conflict(detail: string, instance: string): ProblemDetails {
    return this.create('conflict', 'Conflict', 409, detail, instance);
  }

  static insufficientStock(
    productId: string,
    instance: string,
    requestedQuantity?: number,
    availableStock?: number
  ): ProblemDetails {
    let detail = `Insufficient stock for product ${productId}.`;
    const extensions: Record<string, any> = { productId };

    if (requestedQuantity !== undefined && availableStock !== undefined) {
      detail += ` Requested: ${requestedQuantity}, Available: ${availableStock}`;
      extensions.requestedQuantity = requestedQuantity;
      extensions.availableStock = availableStock;
    }

    return this.create('insufficient-stock', 'Insufficient Stock', 409, detail, instance, extensions);
  }

  static internalError(instance: string): ProblemDetails {
    return this.create(
      'internal-server-error',
      'Internal Server Error',
      500,
      'An unexpected error occurred. Please try again later or contact support if the problem persists.',
      instance
    );
  }
}
