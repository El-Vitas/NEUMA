import { describe, expect, it } from 'bun:test';
import { pathSegmentSchema } from '@/shared/schemas/path-segment.schemas';

describe('pathSegmentSchema', () => {
  it('accepts a uuid and a short slug', () => {
    expect(pathSegmentSchema.safeParse('019ffd48-106b-76bb-85c8-cacd3b62ba79').success).toBe(true);
    expect(pathSegmentSchema.safeParse('space-1').success).toBe(true);
  });

  it('refuses anything that could reach another route', () => {
    expect(pathSegmentSchema.safeParse('../auth/sessions/current').success).toBe(false);
    expect(pathSegmentSchema.safeParse('a/b').success).toBe(false);
    expect(pathSegmentSchema.safeParse('..').success).toBe(false);
    expect(pathSegmentSchema.safeParse('a?b=1').success).toBe(false);
    expect(pathSegmentSchema.safeParse('').success).toBe(false);
  });
});
