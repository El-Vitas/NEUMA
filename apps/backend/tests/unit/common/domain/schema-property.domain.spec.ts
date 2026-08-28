import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@company-brain/db';
import { validateSchemaProperties, validateSchemaPropertyValues } from '@/common/domain/schema-property.domain';

describe('schema property domain validation', () => {
  it('rejects duplicate property keys before persistence', () => {
    const result = validateSchemaProperties([
      { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
      { key: 'title', label: 'Other title', type: DatabasePropertyType.RICH_TEXT, required: false, options: null },
    ]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('requires exactly one TITLE property', () => {
    const result = validateSchemaProperties([
      {
        key: 'status',
        label: 'Status',
        type: DatabasePropertyType.SELECT,
        required: false,
        options: [{ color: null, value: 'todo' }],
      },
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('rejects values that do not match their configured property types', () => {
    const result = validateSchemaPropertyValues(
      [
        { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
        {
          key: 'status',
          label: 'Status',
          type: DatabasePropertyType.SELECT,
          required: false,
          options: [
            { color: null, value: 'todo' },
            { color: null, value: 'done' },
          ],
        },
      ],
      { title: 'Task', status: 'blocked' },
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_VALUE_INVALID');
  });

  it('accepts configured values and rejects unknown keys', () => {
    const result = validateSchemaPropertyValues(
      [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
      { title: 'Task', unknown: true },
    );

    expect(result.isFail()).toBe(true);
  });
});
