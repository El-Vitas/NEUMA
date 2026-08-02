import { describe, expect, it } from 'bun:test';
import { createDatabaseSchema, databaseRecordMutationSchema } from '@/modules/databases/schemas/databases.schemas';

describe('database action contracts', () => {
  it('rejects database action input without the backend-required fields', () => {
    const result = createDatabaseSchema.safeParse({ name: '', slug: '', spaceId: '', template: 'TASKS' });

    expect(result.success).toBe(false);
  });

  it('requires a title and normalized property values for record actions', () => {
    const result = databaseRecordMutationSchema.safeParse({ databaseId: 'database-1', propertyValues: {} });

    expect(result.success).toBe(false);
  });
});
