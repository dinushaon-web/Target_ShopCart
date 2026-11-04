export interface ApiResponse<T> {
  data: T;
  _links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  traceId?: string;
  errors?: ValidationError[];
  [key: string]: any;
}

export interface ValidationError {
  field: string;
  message: string;
  rejectedValue?: any;
}
