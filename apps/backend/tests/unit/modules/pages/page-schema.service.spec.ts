import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, PageLifecycle } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import type { PageRepositoryContract, PageSummary } from '@/modules/pages/types/page.types';
import type { PageSchemaRepositoryContract } from '@/modules/pages/types/page-schema.types';

const titleProperty = { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null };
const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: ['todo', 'done'],
};

const page: PageSummary = {
  content: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: 'page-a',
  lifecycle: PageLifecycle.ACTIVE,
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-a',
  title: 'Collection',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
};

const createPageRepository = (overrides: Partial<PageRepositoryContract> = {}): PageRepositoryContract => ({
  countDescendantsByLifecycle: () => Promise.resolve(0),
  create: () => Promise.resolve(page),
  deleteForever: () => Promise.resolve('DELETED'),
  emptyTrash: () => Promise.resolve([]),
  findReadablePageIds: (pageIds) => Promise.resolve(pageIds),
  getAccessible: () => Promise.resolve(page),
  findMoveContext: () => Promise.resolve(null),
  listTrashed: () => Promise.resolve([]),
  move: () => Promise.resolve(page),
  parentBelongsToSpace: () => Promise.resolve(true),
  listAccessible: () => Promise.resolve([page]),
  restoreCascade: () => Promise.resolve({ restoredChildCount: 0, restoredToRoot: false }),
  trashCascade: () => Promise.resolve(true),
  update: () => Promise.resolve(page),
  ...overrides,
});

const createSchemaRepository = (
  overrides: Partial<PageSchemaRepositoryContract> = {},
): PageSchemaRepositoryContract => ({
  defineSchema: (pageId, properties, views) => Promise.resolve({ pageId, properties, views }),
  getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty], views: [] }),
  resolveSchemaProperties: () => Promise.resolve([titleProperty]),
  listRows: () => Promise.resolve([]),
  listWorkspaceMemberIds: () => Promise.resolve([]),
  ...overrides,
});

describe('page schema service — defineSchema', () => {
  it('rejects a client role', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleProperty],
      role: USER_ROLE.CLIENT,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleProperty],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects a definition missing its single TITLE property before persistence', async () => {
    let defineCalls = 0;
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        defineSchema: (pageId, properties, views) => {
          defineCalls += 1;
          return Promise.resolve({ pageId, properties, views });
        },
      }),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [statusProperty],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
    expect(defineCalls).toBe(0);
  });

  it('rejects a board view whose groupBy does not reference a SELECT property', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleProperty],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [{ name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'title' }, isDefault: true }],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('persists a well-formed schema and returns the owning page space', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleProperty, statusProperty],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(result.getValue().spaceId).toBe('space-a');
    expect(result.getValue().properties).toEqual([titleProperty, statusProperty]);
  });
});

describe('page schema service — getSchema', () => {
  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.getSchema('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('returns the schema for an accessible page', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.getSchema('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ pageId: 'page-a', properties: [titleProperty], spaceId: 'space-a', views: [] });
  });
});

describe('page schema service — listRows', () => {
  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.listRows('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects listing rows of a page that carries no schema', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({ resolveSchemaProperties: () => Promise.resolve([]) }),
    );

    const result = await service.listRows('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_NOT_FOUND');
  });

  it('lists the rows of a schema-carrying page', async () => {
    const row = {
      id: 'row-a',
      lifecycle: PageLifecycle.ACTIVE,
      order: 0,
      parentId: 'page-a',
      propertyValues: { status: 'todo' },
      spaceId: 'space-a',
      title: 'Row A',
    };
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({ listRows: () => Promise.resolve([row]) }),
    );

    const result = await service.listRows('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ rows: [row], spaceId: 'space-a' });
  });
});

describe('page schema service — getView', () => {
  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.getView('page-a', 'Table', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects reading a view of a page that carries no schema', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({ getSchema: (pageId) => Promise.resolve({ pageId, properties: [], views: [] }) }),
    );

    const result = await service.getView('page-a', 'Table', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_NOT_FOUND');
  });

  it('rejects a view name that does not exist on the schema', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty], views: [] }),
      }),
    );

    const result = await service.getView('page-a', 'Missing View', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_VIEW_NOT_FOUND');
  });

  it('returns the rows of a table view in the order the rows repository gives them', async () => {
    const row = {
      id: 'row-a',
      lifecycle: PageLifecycle.ACTIVE,
      order: 0,
      parentId: 'page-a',
      propertyValues: { status: 'todo' },
      spaceId: 'space-a',
      title: 'Row A',
    };
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) =>
          Promise.resolve({
            pageId,
            properties: [titleProperty, statusProperty],
            views: [{ configuration: {}, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE }],
          }),
        listRows: () => Promise.resolve([row]),
      }),
    );

    const result = await service.getView('page-a', 'Table', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ outcome: { kind: 'TABLE_ROWS', rows: [row] }, spaceId: 'space-a' });
  });

  it('returns board columns grouped by the configured select property', async () => {
    const rowTodo = {
      id: 'row-a',
      lifecycle: PageLifecycle.ACTIVE,
      order: 0,
      parentId: 'page-a',
      propertyValues: { status: 'todo' },
      spaceId: 'space-a',
      title: 'Row A',
    };
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) =>
          Promise.resolve({
            pageId,
            properties: [titleProperty, statusProperty],
            views: [
              {
                configuration: { groupBy: 'status' },
                isDefault: true,
                name: 'Board',
                type: DatabaseViewType.BOARD,
              },
            ],
          }),
        listRows: () => Promise.resolve([rowTodo]),
      }),
    );

    const result = await service.getView('page-a', 'Board', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    const outcome = result.getValue().outcome;
    expect(outcome.kind).toBe('BOARD_COLUMNS');
    if (outcome.kind !== 'BOARD_COLUMNS') throw new Error('unreachable');
    expect(outcome.columns.map((column) => column.key)).toEqual(['todo', 'done', 'unassigned']);
  });

  it('signals a missing grouping property when the board view references a property no longer in the schema', async () => {
    const rowTodo = {
      id: 'row-a',
      lifecycle: PageLifecycle.ACTIVE,
      order: 0,
      parentId: 'page-a',
      propertyValues: { status: 'todo' },
      spaceId: 'space-a',
      title: 'Row A',
    };
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) =>
          Promise.resolve({
            pageId,
            properties: [titleProperty],
            views: [
              {
                configuration: { groupBy: 'status' },
                isDefault: true,
                name: 'Board',
                type: DatabaseViewType.BOARD,
              },
            ],
          }),
        listRows: () => Promise.resolve([rowTodo]),
      }),
    );

    const result = await service.getView('page-a', 'Board', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().outcome).toEqual({ kind: 'BOARD_MISSING_GROUPING_PROPERTY' });
  });
});
