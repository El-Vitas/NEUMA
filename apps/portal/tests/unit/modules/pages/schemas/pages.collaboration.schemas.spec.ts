import { describe, expect, it } from 'bun:test';
import {
  pageCollaborationTokenRequestSchema,
  pageCollaborationTokenResponseSchema,
} from '@/modules/pages/schemas/pages.collaboration.schemas';

describe('page collaboration schemas', () => {
  it('accepts a saved page token request and token response', () => {
    const pageId = '22222222-2222-4222-8222-222222222222';

    expect(pageCollaborationTokenRequestSchema.parse({ pageId })).toEqual({ pageId });
    expect(pageCollaborationTokenResponseSchema.parse({ token: 'short-lived-token' })).toEqual({
      token: 'short-lived-token',
    });
  });

  it('rejects malformed page ids and empty collaboration tokens', () => {
    expect(() => pageCollaborationTokenRequestSchema.parse({ pageId: 'not-a-uuid' })).toThrow();
    expect(() => pageCollaborationTokenResponseSchema.parse({ token: '' })).toThrow();
  });
});
