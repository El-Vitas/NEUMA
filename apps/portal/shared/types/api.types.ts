export interface ApiErrorOptions {
  code?: string;
  data?: unknown;
}

export interface ParsedError {
  message: string;
  code?: string;
  data?: unknown;
}
