import { describe, expect, it } from 'bun:test';
import {
  parseSchemaPropertyValues,
  toSchemaViewDefinition,
} from '@/common/infrastructure/persistence/schema-json.adapter';

describe('toSchemaViewDefinition', () => {
  // The null stored by a condition that compares against nothing is part of the condition: dropping it breaks the
  // contract and the whole filter stops being read.
  it('keeps a null that a stored filter condition deliberately holds', () => {
    const view = toSchemaViewDefinition({
      configuration: {
        filter: {
          conditions: [{ kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: 'status', value: null }],
          kind: 'GROUP',
          operator: 'AND',
        },
      },
      id: 'view-1',
      isDefault: true,
      name: 'Table',
      type: 'TABLE',
      version: 0,
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
      id: 'view-1',
      isDefault: true,
      name: 'Table',
      type: 'TABLE',
      version: 0,
    });

    expect(view?.configuration).toEqual({ groupBy: null, sorts: [] });
  });

  it('carries the id and the version the view has in storage', () => {
    const view = toSchemaViewDefinition({
      configuration: {},
      id: 'view-9',
      isDefault: false,
      name: 'Board',
      type: 'BOARD',
      version: 4,
    });

    expect(view?.id).toBe('view-9');
    expect(view?.version).toBe(4);
  });

  it('refuses a configuration that is not an object at all', () => {
    expect(
      toSchemaViewDefinition({
        configuration: 'nonsense',
        id: 'view-1',
        isDefault: true,
        name: 'Table',
        type: 'TABLE',
        version: 0,
      }),
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
