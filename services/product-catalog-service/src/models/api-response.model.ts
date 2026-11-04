/**
 * API response models following RFC 7807 Problem Details format
 */

export interface ApiResponse<T> {
  data: T;
  _links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
  };
  totalCount?: number;
}

/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  type: string; // URI reference identifying the problem type
  title: string; // Short, human-readable summary
  status: number; // HTTP status code
  detail: string; // Human-readable explanation
  instance: string; // URI reference identifying the specific occurrence
  timestamp: string; // ISO-8601 timestamp
  traceId?: string; // AWS X-Ray trace ID
  errors?: ValidationError[]; // Detailed validation errors (for 400 responses)
  [key: string]: any; // Additional problem-specific fields
}

export interface ValidationError {
  field: string;
  message: string;
  rejectedValue?: any;
}
