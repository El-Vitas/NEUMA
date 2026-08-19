import { describe, expect, test } from 'bun:test';
import { pageIconSchema } from './page-icon.schema.js';

describe('pageIconSchema', () => {
  test('accepts a well-formed emoji icon', () => {
    expect(pageIconSchema.safeParse({ kind: 'emoji', value: '🚀' }).success).toBe(true);
  });

  test('accepts a well-formed image icon', () => {
    expect(pageIconSchema.safeParse({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', kind: 'image' }).success).toBe(
      true,
    );
  });

  test('rejects an empty emoji value', () => {
    expect(pageIconSchema.safeParse({ kind: 'emoji', value: '' }).success).toBe(false);
  });

  test('rejects an emoji value longer than the allowed length', () => {
    expect(pageIconSchema.safeParse({ kind: 'emoji', value: 'x'.repeat(32) }).success).toBe(false);
  });

  test('rejects an image icon with a non-uuid assetId', () => {
    expect(pageIconSchema.safeParse({ assetId: 'not-a-uuid', kind: 'image' }).success).toBe(false);
  });

  test('rejects an unknown icon kind', () => {
    expect(pageIconSchema.safeParse({ kind: 'sticker', value: '🚀' }).success).toBe(false);
  });
});
