import { describe, expect, it } from 'bun:test';
import { parseSchemaPropertyValues } from '@/common/infrastructure/persistence/schema-json.adapter';

describe('parseSchemaPropertyValues', () => {
  it('parses a stored JSON blob into typed property values, dropping anything unrecognizable', () => {
    const parsed = parseSchemaPropertyValues({ status: 'done', weird: { nested: true }, count: 3 });

    expect(parsed).toEqual({ status: 'done', count: 3 });
  });

  it('returns null when the stored JSON value is not a plain object', () => {
    expect(parseSchemaPropertyValues(null)).toBeNull();
    expect(parseSchemaPropertyValues(['a', 'b'])).toBeNull();
  });
});
