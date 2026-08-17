import { describe, expect, it } from 'bun:test';
import { readJsonSafely } from '@/shared/lib/json.lib';

describe('readJsonSafely', () => {
  it('parses valid JSON', () => {
    expect(readJsonSafely('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null instead of throwing when the input is not valid JSON', () => {
    expect(readJsonSafely('not json')).toBeNull();
  });
});
