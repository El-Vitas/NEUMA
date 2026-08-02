import { describe, expect, it } from 'bun:test';
import { DatabaseLifecycle, DatabasePropertyType, DatabaseTemplate } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { DatabasesService } from '@/modules/databases/databases.service';
import type { DatabaseRepositoryContract } from '@/modules/databases/types/database.types';

const database = {
  id: 'database-a',
  spaceId: 'space-a',
  workspaceId: 'workspace-a',
  name: 'Tasks',
  slug: 'tasks',
  template: DatabaseTemplate.TASKS,
  lifecycle: DatabaseLifecycle.ACTIVE,
  properties: [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
  views: [],
};

const createRepository = (): DatabaseRepositoryContract => ({
  create: () => Promise.resolve(database),
  createProperty: () => Promise.resolve(database),
  createRecord: () =>
    Promise.resolve({
      databaseId: 'database-a',
      id: 'record-a',
      lifecycle: DatabaseLifecycle.ACTIVE,
      order: 0,
      propertyValues: { title: 'Task' },
      title: 'Task',
    }),
  createView: () => Promise.resolve(database),
  findAccessible: () => Promise.resolve(database),
  listAccessible: () => Promise.resolve([database]),
  listRecords: () => Promise.resolve([]),
  listWorkspaceMemberIds: () => Promise.resolve([]),
  updateRecord: () =>
    Promise.resolve({
      databaseId: 'database-a',
      id: 'record-a',
      lifecycle: DatabaseLifecycle.ACTIVE,
      order: 0,
      propertyValues: { title: 'Task' },
      title: 'Task',
    }),
});

describe('databases service', () => {
  it('allows editors to create databases', async () => {
    const service = new DatabasesService(createRepository());
    const result = await service.create(
      {
        name: 'Tasks',
        slug: 'tasks',
        spaceId: 'space-a',
        workspaceId: 'workspace-a',
        template: DatabaseTemplate.TASKS,
      },
      'user-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
  });

  it('rejects viewers before repository mutation', async () => {
    let createCalls = 0;
    const repository = {
      ...createRepository(),
      create: () => {
        createCalls += 1;
        return Promise.resolve(database);
      },
    };
    const service = new DatabasesService(repository);
    const result = await service.create(
      {
        name: 'Tasks',
        slug: 'tasks',
        spaceId: 'space-a',
        workspaceId: 'workspace-a',
        template: DatabaseTemplate.TASKS,
      },
      'user-a',
      USER_ROLE.CLIENT,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_ACCESS_DENIED');
    expect(createCalls).toBe(0);
  });

  it('returns only the repository-authorized database read', async () => {
    const repository = { ...createRepository(), findAccessible: () => Promise.resolve(null) };
    const service = new DatabasesService(repository);
    const result = await service.getAccessible('database-a', 'workspace-a', 'user-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_ACCESS_DENIED');
  });

  it('validates person values against workspace members', async () => {
    const repository = {
      ...createRepository(),
      findAccessible: () =>
        Promise.resolve({
          ...database,
          properties: [
            { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
            { key: 'assignee', label: 'Assignee', type: DatabasePropertyType.PERSON, required: false, options: null },
          ],
        }),
      createRecord: () =>
        Promise.resolve({
          databaseId: 'database-a',
          id: 'record-a',
          lifecycle: DatabaseLifecycle.ACTIVE,
          order: 0,
          propertyValues: { title: 'Task', assignee: 'member-a' },
          title: 'Task',
        }),
      listWorkspaceMemberIds: () => Promise.resolve(['member-a']),
    };
    const service = new DatabasesService(repository);
    const result = await service.createRecord({
      databaseId: 'database-a',
      workspaceId: 'workspace-a',
      userId: 'user-a',
      role: USER_ROLE.WORKER,
      title: 'Task',
      propertyValues: { title: 'Task', assignee: 'member-a' },
    });

    expect(result.isOk()).toBe(true);
  });

  it('merges the standalone title into record values before validation and update', async () => {
    let receivedValues: Readonly<Record<string, unknown>> | undefined;
    const repository = {
      ...createRepository(),
      updateRecord: (input: Parameters<DatabaseRepositoryContract['updateRecord']>[0]) => {
        receivedValues = input.propertyValues;
        return Promise.resolve({
          databaseId: 'database-a',
          id: 'record-a',
          lifecycle: DatabaseLifecycle.ACTIVE,
          order: 0,
          propertyValues: { title: 'Updated' },
          title: 'Updated',
        });
      },
    };
    const service = new DatabasesService(repository);

    const result = await service.updateRecord({
      databaseId: 'database-a',
      propertyValues: {},
      recordId: 'record-a',
      role: USER_ROLE.WORKER,
      title: 'Updated',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(receivedValues).toEqual({ title: 'Updated' });
  });

  it('validates a new property against the complete existing schema before repository mutation', async () => {
    let createPropertyCalls = 0;
    const repository = {
      ...createRepository(),
      createProperty: () => {
        createPropertyCalls += 1;
        return Promise.resolve(database);
      },
      findAccessible: () =>
        Promise.resolve({
          ...database,
          properties: [
            { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null },
            { key: 'status', label: 'Status', type: DatabasePropertyType.SELECT, required: false, options: ['todo'] },
          ],
        }),
    };
    const service = new DatabasesService(repository);

    const result = await service.createProperty({
      databaseId: 'database-a',
      property: {
        key: 'status',
        label: 'Duplicate',
        type: DatabasePropertyType.SELECT,
        required: false,
        options: ['done'],
      },
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_PROPERTY_INVALID');
    expect(createPropertyCalls).toBe(0);
  });
});
