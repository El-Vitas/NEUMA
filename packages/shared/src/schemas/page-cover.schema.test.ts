import { describe, expect, test } from 'bun:test';
import { pageCoverValueSchema } from './page-cover.schema.js';

describe('pageCoverValueSchema', () => {
  test('accepts a well-formed cover', () => {
    expect(
      pageCoverValueSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 40 }).success,
    ).toBe(true);
  });

  test('accepts the boundary positions', () => {
    expect(
      pageCoverValueSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 0 }).success,
    ).toBe(true);
    expect(
      pageCoverValueSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 100 }).success,
    ).toBe(true);
  });

  test('rejects a position below the allowed range, given an otherwise valid assetId', () => {
    expect(
      pageCoverValueSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: -1 }).success,
    ).toBe(false);
  });

  test('rejects a position above the allowed range, given an otherwise valid assetId', () => {
    expect(
      pageCoverValueSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 101 }).success,
    ).toBe(false);
  });

  test('rejects a cover with a non-uuid assetId', () => {
    expect(pageCoverValueSchema.safeParse({ assetId: 'not-a-uuid', position: 50 }).success).toBe(false);
  });
});
