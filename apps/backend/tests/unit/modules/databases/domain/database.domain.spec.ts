import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@company-brain/db';
import { validateDatabaseProperties, validateRecordValues } from '@/modules/databases/domain/database.domain';

describe('database domain validation', () => {
  it('rejects duplicate property keys before persistence', () => {
    const result = validateDatabaseProperties([
      { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
      { key: 'title', label: 'Other title', type: DatabasePropertyType.RICH_TEXT, required: false, options: null },
    ]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_PROPERTY_INVALID');
  });

  it('rejects record values that do not match their configured property types', () => {
    const result = validateRecordValues(
      [
        { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
        {
          key: 'status',
          label: 'Status',
          type: DatabasePropertyType.SELECT,
          required: false,
          options: ['todo', 'done'],
        },
      ],
      { title: 'Task', status: 'blocked' },
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_RECORD_INVALID');
  });

  it('accepts configured values and rejects unknown keys', () => {
    const result = validateRecordValues(
      [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
      { title: 'Task', unknown: true },
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_RECORD_INVALID');
  });
});
