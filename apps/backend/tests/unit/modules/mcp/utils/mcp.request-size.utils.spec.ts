import { describe, expect, it } from 'bun:test';
import { MCP_ANONYMOUS_BODY_LIMIT_BYTES } from '@/modules/mcp/constants/mcp.limits.constants';
import { isBodyTooLargeForCaller } from '@/modules/mcp/utils/mcp.request-size.utils';

const large = String(MCP_ANONYMOUS_BODY_LIMIT_BYTES + 1);

describe('isBodyTooLargeForCaller', () => {
  it('refuses a large body from a caller without anything shaped like a token', () => {
    expect(isBodyTooLargeForCaller({ contentLength: large, hasTokenShape: false })).toBe(true);
  });

  it('refuses a body of unknown length from a caller without a token shape', () => {
    expect(isBodyTooLargeForCaller({ contentLength: undefined, hasTokenShape: false })).toBe(true);
  });

  it('refuses a length that is not a number', () => {
    expect(isBodyTooLargeForCaller({ contentLength: 'many', hasTokenShape: false })).toBe(true);
  });

  it('lets a small body through without a token', () => {
    expect(isBodyTooLargeForCaller({ contentLength: '120', hasTokenShape: false })).toBe(false);
  });

  it('lets a large body through when the token has the shape of one', () => {
    expect(isBodyTooLargeForCaller({ contentLength: large, hasTokenShape: true })).toBe(false);
  });
});
