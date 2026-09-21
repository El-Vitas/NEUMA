import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import {
  pageCarriesSchema,
  validatePageProperties,
  validatePageSchemaDefinition,
  validatePageSchemaView,
  validatePageSchemaViews,
} from '@/modules/pages/domain/page-schema.domain';

const titleProperty = { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null };
const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: null, value: 'todo' },
    { color: null, value: 'done' },
  ],
};

describe('pageCarriesSchema', () => {
  it('is false for a page with no schema properties', () => {
    expect(pageCarriesSchema([])).toBe(false);
  });

  it('is true once a page has at least one schema property', () => {
    expect(pageCarriesSchema([titleProperty])).toBe(true);
  });
});

describe('validatePageSchemaDefinition', () => {
  it('requires exactly one TITLE property', () => {
    const result = validatePageSchemaDefinition([statusProperty]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('accepts a well-formed set of properties', () => {
    const result = validatePageSchemaDefinition([titleProperty, statusProperty]);

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageSchemaView', () => {
  it('rejects a board view whose groupBy is not a SELECT property', () => {
    const result = validatePageSchemaView(
      { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'title' }, isDefault: true },
      [titleProperty],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('accepts a board view whose groupBy references a SELECT property', () => {
    const result = validatePageSchemaView(
      { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: true },
      [titleProperty, statusProperty],
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageSchemaViews', () => {
  it('rejects duplicate view names', () => {
    const result = validatePageSchemaViews(
      [
        { name: 'Board', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true },
        { name: 'Board', type: DatabaseViewType.TABLE, configuration: {}, isDefault: false },
      ],
      [titleProperty],
    );

    expect(result.isFail()).toBe(true);
  });

  it('accepts a set of distinctly named, individually valid views', () => {
    const result = validatePageSchemaViews(
      [
        { name: 'Table', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true },
        { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: false },
      ],
      [titleProperty, statusProperty],
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageProperties — parent carries a schema', () => {
  const schemaProperties = [titleProperty, statusProperty];

  it('rejects values that violate the schema', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'blocked' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('accepts conforming values', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'todo' });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ status: 'todo' });
  });

  it('accepts a row with no optional values set', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({});
  });

  it('rejects the title property showing up inside propertyValues, since it is not duplicated there', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { title: 'Duplicate', status: 'todo' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('never stores the title key inside the returned property values', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'todo' });
    const value = result.getValue();

    expect(result.isOk()).toBe(true);
    expect(Object.keys(value ?? {})).not.toContain('title');
  });
});

describe('validatePageProperties — parent carries no schema', () => {
  it('rejects any property values at all', () => {
    const result = validatePageProperties([], 'A Plain Page', { status: 'todo' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('accepts a page with no property values', () => {
    const result = validatePageProperties([], 'A Plain Page', null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('accepts a page with an explicit empty property values object', () => {
    const result = validatePageProperties([], 'A Plain Page', {});

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });
});
