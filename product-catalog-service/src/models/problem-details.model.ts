// RFC 7807 Problem Details for HTTP APIs
export interface ProblemDetails {
  type: string;           // URI reference identifying the problem type
  title: string;          // Short, human-readable summary
  status: number;         // HTTP status code
  detail: string;         // Human-readable explanation
  instance: string;       // URI reference identifying the specific occurrence
  [key: string]: any;     // Additional extension members
}

export class ProblemDetailsFactory {
  static create(
    type: string,
    title: string,
    status: number,
    detail: string,
    instance: string,
    extensions?: Record<string, any>
  ): ProblemDetails {
    return {
      type: `https://api.shopcart.com/problems/${type}`,
      title,
      status,
      detail,
      instance,
      ...extensions
    };
  }

  static notFound(resource: string, id: string, instance: string): ProblemDetails {
    return this.create(
      'not-found',
      'Resource Not Found',
      404,
      `${resource} with ID ${id} does not exist`,
      instance
    );
  }

  static validationError(detail: string, instance: string): ProblemDetails {
    return this.create(
      'validation-error',
      'Validation Error',
      400,
      detail,
      instance
    );
  }

  static insufficientStock(productId: string, instance: string): ProblemDetails {
    return this.create(
      'insufficient-stock',
      'Insufficient Stock',
      409,
      `Insufficient stock for product ${productId}`,
      instance
    );
  }

  static unauthorized(instance: string): ProblemDetails {
    return this.create(
      'unauthorized',
      'Unauthorized',
      401,
      'Authentication required',
      instance
    );
  }

  static internalError(instance: string): ProblemDetails {
    return this.create(
      'internal-error',
      'Internal Server Error',
      500,
      'An unexpected error occurred',
      instance
    );
  }
}
