import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, PageLifecycle } from '@neuma/db';
import { Result, USER_ROLE } from '@neuma/shared';
import {
  COLLECTION_QUERY_ROW_LIMIT,
  COLLECTION_ROW_LIMIT,
  SCHEMA_OPTION_ALREADY_MOVED,
} from '@/modules/pages/constants/pages.constants';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import type { PageRepositoryContract, PageSummary } from '@/modules/pages/types/page.types';
import type { PageSchemaRepositoryContract } from '@/modules/pages/types/page-schema.types';

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

const page: PageSummary = {
  content: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  hasOwnPermissions: false,
  id: 'page-a',
  lifecycle: PageLifecycle.ACTIVE,
  lockedAt: null,
  order: 0,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-a',
  title: 'Collection',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
};

const createPageRepository = (overrides: Partial<PageRepositoryContract> = {}): PageRepositoryContract => ({
  countDescendantsByLifecycle: () => Promise.resolve(0),
  create: () => Promise.resolve(page),
  deleteForever: () => Promise.resolve('SCHEDULED'),
  duplicate: () => Promise.resolve(page),
  emptyTrash: () => Promise.resolve([]),
  findReadablePageIds: (pageIds) => Promise.resolve(pageIds),
  getAccessible: () => Promise.resolve(page),
  findMoveContext: () => Promise.resolve(null),
  listMoveDestinations: () => Promise.resolve({ pages: [], spaces: [] }),
  listTrashed: () => Promise.resolve([]),
  listWithProperties: () => Promise.resolve([]),
  move: () => Promise.resolve(page),
  parentBelongsToSpace: () => Promise.resolve(true),
  listAccessible: () => Promise.resolve([page]),
  restoreCascade: () =>
    Promise.resolve({ parentTitle: null, restoredChildCount: 0, restoredToRoot: false, spaceName: null }),
  trashCascade: () => Promise.resolve(true),
  findVersion: () => Promise.resolve(null),
  listVersions: () => Promise.resolve({ items: [], nextCursor: null }),
  recordVersion: () => Promise.resolve(),
  restoreVersion: () => Promise.resolve(null),
  writeContent: () => Promise.resolve(null),
  updatePropertyValues: (_input, merge) => {
    const merged = merge(null);
    return Promise.resolve(merged.isOk() ? Result.ok(page) : Result.fail(merged.getError()));
  },
  rename: () => Promise.resolve(page),
  reorderAmongSiblings: () => Promise.resolve([page]),
  setLocked: () => Promise.resolve(page),
  setOwner: () => Promise.resolve(page),
  setVerification: () => Promise.resolve(page),
  updateCover: () => Promise.resolve(page),
  updateIcon: () => Promise.resolve(page),
  ...overrides,
});

const createSchemaRepository = (
  overrides: Partial<PageSchemaRepositoryContract> = {},
): PageSchemaRepositoryContract => ({
  defineSchema: (pageId, shape) => Promise.resolve({ pageId, ...shape }),
  getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty], views: [] }),
  rewriteOption: (pageId, _propertyKey, _rename, properties) => Promise.resolve({ pageId, properties, views: [] }),
  listPersonPropertyKeys: () => Promise.resolve(new Map()),
  resolveSchemaProperties: () => Promise.resolve([titleProperty]),
  setViewConfiguration: (pageId) => Promise.resolve({ pageId, properties: [titleProperty], views: [] }),
  listRows: () => Promise.resolve({ hasMore: false, rows: [] }),
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
        defineSchema: (pageId, shape) => {
          defineCalls += 1;
          return Promise.resolve({ pageId, ...shape });
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

describe('page schema service — rewriteOption', () => {
  const renaming = {
    from: 'todo',
    pageId: 'page-a',
    propertyKey: 'status',
    role: USER_ROLE.WORKER,
    to: 'pendiente',
    userId: 'user-a',
    workspaceId: 'workspace-a',
  };
  const schemaWithStatus = () =>
    createSchemaRepository({
      getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
    });

  it('rejects a client role', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, role: USER_ROLE.CLIENT });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      schemaWithStatus(),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects a name another option already answers to', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, to: 'done' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('gives up when somebody else moved that same option first', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
        rewriteOption: () => Promise.resolve(SCHEMA_OPTION_ALREADY_MOVED),
      }),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('hands the rewritten shape to the repository, together with where the name comes from', async () => {
    const asked: { properties?: unknown; rename?: unknown }[] = [];
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
        rewriteOption: (pageId, _propertyKey, rename, properties) => {
          asked.push({ properties, rename });
          return Promise.resolve({ pageId, properties, views: [] });
        },
      }),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isOk()).toBe(true);
    expect(asked[0]?.rename).toEqual({ from: 'todo', to: 'pendiente' });
    expect(asked).toHaveLength(1);
    expect(result.getValue().properties[1]?.options).toEqual([
      { color: null, value: 'pendiente' },
      { color: null, value: 'done' },
    ]);
  });

  it('removes the column when no new name is given, leaving the rest of the options alone', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, to: null });

    expect(result.isOk()).toBe(true);
    expect(result.getValue().properties[1]?.options).toEqual([{ color: null, value: 'done' }]);
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
      createSchemaRepository({ listRows: () => Promise.resolve({ hasMore: false, rows: [row] }) }),
    );

    const result = await service.listRows('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ hasMore: false, rows: [row], spaceId: 'space-a' });
  });

  it('passes on that the collection held more rows than were brought', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({ listRows: () => Promise.resolve({ hasMore: true, rows: [] }) }),
    );

    const result = await service.listRows('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().hasMore).toBe(true);
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
        listRows: () => Promise.resolve({ hasMore: false, rows: [row] }),
      }),
    );

    const result = await service.getView('page-a', 'Table', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({
      hasMore: false,
      outcome: { kind: 'FLAT_ROWS', rows: [row] },
      rowCount: 1,
      spaceId: 'space-a',
      totalRowCount: 1,
    });
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
        listRows: () => Promise.resolve({ hasMore: false, rows: [rowTodo] }),
      }),
    );

    const result = await service.getView('page-a', 'Board', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    const outcome = result.getValue().outcome;
    expect(outcome.kind).toBe('GROUPED_ROWS');
    if (outcome.kind !== 'GROUPED_ROWS') throw new Error('unreachable');
    expect(outcome.groups.map((group) => group.key)).toEqual(['todo', 'done', 'unassigned']);
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
        listRows: () => Promise.resolve({ hasMore: false, rows: [rowTodo] }),
      }),
    );

    const result = await service.getView('page-a', 'Board', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().outcome).toEqual({ kind: 'MISSING_GROUPING_PROPERTY' });
  });
});

describe('page schema service — queryRows', () => {
  const rowOf = (id: string, status: string, order: number) => ({
    id,
    lifecycle: PageLifecycle.ACTIVE,
    order,
    parentId: 'page-a',
    propertyValues: { status },
    spaceId: 'space-a',
    title: `Row ${id}`,
  });
  const rows = [rowOf('a', 'todo', 0), rowOf('b', 'done', 1), rowOf('c', 'todo', 2)];
  const todoFilter = { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' };

  const queryWith = (schemaOverrides: Partial<PageSchemaRepositoryContract> = {}) =>
    new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) =>
          Promise.resolve({
            pageId,
            properties: [titleProperty, statusProperty],
            views: [
              {
                configuration: { filter: todoFilter, groupBy: 'status' },
                isDefault: true,
                name: 'Pendientes',
                type: DatabaseViewType.BOARD,
              },
            ],
          }),
        listRows: () => Promise.resolve({ hasMore: false, rows }),
        ...schemaOverrides,
      }),
    );

  const reader = { role: USER_ROLE.WORKER, userId: 'user-a', workspaceId: 'workspace-a' };

  it('reads the rows as a view reads them, in one list, with each row whole', async () => {
    const result = await queryWith().queryRows({
      ...reader,
      configuration: null,
      pageId: 'page-a',
      viewName: 'Pendientes',
    });

    expect(result.isOk()).toBe(true);
    expect(result.getValue().rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(result.getValue().rows[0]).toEqual(rowOf('a', 'todo', 0));
  });

  it('looks through far more rows than a listing does before filtering them', async () => {
    const asked: number[] = [];
    await queryWith({
      listRows: (_pageId, _workspaceId, _userId, _role, limit) => {
        asked.push(limit);
        return Promise.resolve({ hasMore: false, rows });
      },
    }).queryRows({ ...reader, configuration: null, pageId: 'page-a', viewName: 'Pendientes' });

    expect(asked).toEqual([COLLECTION_QUERY_ROW_LIMIT]);
    expect(COLLECTION_QUERY_ROW_LIMIT).toBeGreaterThan(COLLECTION_ROW_LIMIT);
  });

  it('reads the rows with a filter of its own, not the one of any view', async () => {
    const result = await queryWith().queryRows({
      ...reader,
      configuration: { filter: { ...todoFilter, operator: 'IS_NOT' } },
      pageId: 'page-a',
      viewName: null,
    });

    expect(result.getValue().rows.map((row) => row.id)).toEqual(['b']);
  });

  it('reads every row when asked for nothing in particular', async () => {
    const result = await queryWith().queryRows({ ...reader, configuration: null, pageId: 'page-a', viewName: null });

    expect(result.getValue().rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('refuses a filter on a column the collection does not have', async () => {
    const result = await queryWith().queryRows({
      ...reader,
      configuration: { filter: { ...todoFilter, propertyKey: 'ghost' } },
      pageId: 'page-a',
      viewName: null,
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
    expect(String(result.getError().details)).toContain('no column ghost');
    expect(String(result.getError().details)).toContain('title, status');
  });

  it('says a view the collection does not have is not there', async () => {
    const result = await queryWith().queryRows({ ...reader, configuration: null, pageId: 'page-a', viewName: 'Otra' });

    expect(result.getError().code).toBe('PAGE_VIEW_NOT_FOUND');
  });

  it('refuses a page that is not a collection', async () => {
    const result = await queryWith({
      getSchema: (pageId) => Promise.resolve({ pageId, properties: [], views: [] }),
    }).queryRows({ ...reader, configuration: null, pageId: 'page-a', viewName: null });

    expect(result.getError().code).toBe('PAGE_SCHEMA_NOT_FOUND');
  });
});
