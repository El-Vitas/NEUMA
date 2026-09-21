import { describe, expect, it } from 'bun:test';
import {
  parseSchemaPropertyValues,
  toSchemaViewDefinition,
} from '@/common/infrastructure/persistence/schema-json.adapter';

describe('toSchemaViewDefinition', () => {
  /**
   * A condition that compares against nothing stores a null value, and that
   * null is part of what the condition says. Dropping it hands back a condition
   * missing a field its own contract requires, and the whole filter stops being
   * read at all.
   */
  it('keeps a null that a stored filter condition deliberately holds', () => {
    const view = toSchemaViewDefinition({
      configuration: {
        filter: {
          conditions: [{ kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: 'status', value: null }],
          kind: 'GROUP',
          operator: 'AND',
        },
      },
      isDefault: true,
      name: 'Table',
      type: 'TABLE',
    });

    expect(view?.configuration).toEqual({
      filter: {
        conditions: [{ kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: 'status', value: null }],
        kind: 'GROUP',
        operator: 'AND',
      },
    });
  });

  it('keeps a null a view stores at the top of its configuration', () => {
    const view = toSchemaViewDefinition({
      configuration: { groupBy: null, sorts: [] },
      isDefault: true,
      name: 'Table',
      type: 'TABLE',
    });

    expect(view?.configuration).toEqual({ groupBy: null, sorts: [] });
  });

  it('refuses a configuration that is not an object at all', () => {
    expect(
      toSchemaViewDefinition({ configuration: 'nonsense', isDefault: true, name: 'Table', type: 'TABLE' }),
    ).toBeNull();
  });
});

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
