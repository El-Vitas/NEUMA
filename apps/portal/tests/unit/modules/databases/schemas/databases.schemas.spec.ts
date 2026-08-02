import { describe, expect, it } from 'bun:test';
import { createDatabaseSchema, databaseSummarySchema } from '@/modules/databases/schemas/databases.schemas';

describe('databases.schemas', () => {
  it('accepts only template database creation fields required by the backend', () => {
    expect(
      createDatabaseSchema.safeParse({
        name: 'Project tracker',
        slug: 'project-tracker',
        spaceId: 'space-1',
        template: 'PROJECTS',
      }).success,
    ).toBe(true);
    expect(createDatabaseSchema.safeParse({ name: 'Tasks', template: 'TASKS' }).success).toBe(false);
  });

  it('normalizes a database summary with typed properties and views', () => {
    const result = databaseSummarySchema.safeParse({
      id: 'database-1',
      lifecycle: 'ACTIVE',
      name: 'Tasks',
      properties: [{ key: 'status', label: 'Status', options: ['todo', 'done'], required: true, type: 'SELECT' }],
      slug: 'tasks',
      spaceId: 'space-1',
      template: 'TASKS',
      views: [{ configuration: { groupBy: 'status' }, isDefault: false, name: 'Board', type: 'BOARD' }],
      workspaceId: 'workspace-1',
    });

    expect(result.success).toBe(true);
  });
});
