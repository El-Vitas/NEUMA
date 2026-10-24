import { MCP_ANONYMOUS_BODY_LIMIT_BYTES } from '../constants/mcp.limits.constants';
import type { McpRequestSize } from '../types/mcp.request.types';

/**
 * The body is parsed before any guard runs, so the large allowance for a file upload is kept for callers that at
 * least present something shaped like a token. Everyone else gets the small allowance.
 */
export const isBodyTooLargeForCaller = ({ contentLength, hasTokenShape }: McpRequestSize): boolean => {
  if (hasTokenShape) return false;
  const declaredLength = contentLength === undefined ? Number.POSITIVE_INFINITY : Number(contentLength);
  return !(declaredLength <= MCP_ANONYMOUS_BODY_LIMIT_BYTES);
};
