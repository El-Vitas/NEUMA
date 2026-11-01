import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import type {
  PageFilter,
  PagePropertyValue,
  PageQueryOutcome,
  PageQueryRequest,
  PageQueryResponse,
  PageSort,
  PageViewConfiguration,
} from '@neuma/shared';
import { EMPTY_PAGE_VIEW_CONFIGURATION, PAGE_STATUS_GROUP_VALUES } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { listPageViewRowsInReadingOrder } from '../helpers/page-view.oracle';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaProperty {
  key: string;
  options?: { group?: string; id: string; value: string }[] | null;
}

interface SchemaResponse {
  properties: SchemaProperty[];
  views: { id: string; name: string; version: number }[];
}

interface RowsResponse {
  rows: { id: string; order: number; propertyValues: Record<string, PagePropertyValue> | null; title: string }[];
}

const PASSWORD = 'plainPassword123';

const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

const PROPERTIES = [
  TITLE,
  { key: 'status', label: 'Status', options: null, required: false, type: DatabasePropertyType.STATUS },
  {
    key: 'priority',
    label: 'Priority',
    options: ['low', 'mid', 'high'],
    required: false,
    type: DatabasePropertyType.SELECT,
  },
  { key: 'points', label: 'Points', options: null, required: false, type: DatabasePropertyType.NUMBER },
  {
    config: { allowsMultiple: true },
    key: 'owner',
    label: 'Owner',
    options: null,
    required: false,
    type: DatabasePropertyType.PERSON,
  },
  {
    key: 'tags',
    label: 'Tags',
    options: ['a', 'b', 'c'],
    required: false,
    type: DatabasePropertyType.MULTI_SELECT,
  },
  { key: 'due', label: 'Due', options: null, required: false, type: DatabasePropertyType.DATE },
  { key: 'done', label: 'Done', options: null, required: false, type: DatabasePropertyType.CHECKBOX },
];

describe('Querying a collection by reducers (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let workerId: string;
  let spaceId: string;
  let collectionId: string;
  let schema: SchemaResponse;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const optionId = (key: string, name: string): string => {
    const option = schema.properties.find((property) => property.key === key)?.options?.find((o) => o.value === name);
    if (option === undefined) throw new Error(`No option ${name} in ${key}`);
    return option.id;
  };

  const statusId = (group: string): string => {
    const option = schema.properties
      .find((property) => property.key === 'status')
      ?.options?.find((o) => o.group === group);
    if (option === undefined) throw new Error(`No status in ${group}`);
    return option.id;
  };

  const query = (body: PageQueryRequest, token = adminToken, collection = collectionId) =>
    request(testApp.getServer()).post(`/api/v1/spaces/${spaceId}/pages/${collection}/query`).set(as(token)).send(body);

  const ask = async (
    body: PageQueryRequest,
    token = adminToken,
    collection = collectionId,
  ): Promise<PageQueryResponse> => (await query(body, token, collection).expect(200)).body as PageQueryResponse;

  const outcomeOf = (response: PageQueryResponse, id: string): PageQueryOutcome => {
    const outcome = response.reducers[id];
    if (outcome === undefined) throw new Error(`No outcome ${id}`);
    return outcome;
  };

  /** Every id a `results` reducer yields, a few at a time, to exercise the cursor. */
  const readAll = async (
    body: Omit<PageQueryRequest, 'reducers'>,
    pageSize = 4,
    token = adminToken,
  ): Promise<string[]> => {
    const ids: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 50; guard += 1) {
      const response = await ask(
        { ...body, reducers: [{ cursor, id: 'rows', kind: 'results', limit: pageSize }] },
        token,
      );
      const outcome = outcomeOf(response, 'rows');
      if (outcome.kind !== 'results') throw new Error('not results');
      ids.push(...outcome.ids);
      if (outcome.nextCursor === null) return ids;
      cursor = outcome.nextCursor;
    }
    throw new Error('The cursor never ended');
  };

  const createRow = async (title: string, propertyValues: Record<string, unknown>): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({
        content: {
          content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        parentId: collectionId,
        propertyValues,
        title,
      });
    expect({ body: response.body as unknown, status: response.status, title }).toMatchObject({ status: 201 });
    return (response.body as { id: string }).id;
  };

  const oracleIds = async (configuration: Partial<PageViewConfiguration>): Promise<string[]> => {
    const everything = await ask({ reducers: [{ id: 'rows', kind: 'results', limit: 100 }] });
    const everyRow = outcomeOf(everything, 'rows');
    if (everyRow.kind !== 'results') throw new Error('not results');
    const rows: RowsResponse = {
      rows: everyRow.ids.flatMap((id, position) => {
        const row = everything.rows[id];
        return row === undefined ? [] : [{ id, order: position, propertyValues: row.propertyValues, title: row.title }];
      }),
    };
    const definitions = schema.properties.map((property) => ({
      config: {
        allowsMultiple: true,
        currency: null,
        decimals: null,
        mirrorPropertyKey: null,
        numberFormat: 'NUMBER' as const,
        prefix: '',
        targetCollectionId: null,
      },
      key: property.key,
      label: property.key,
      options:
        property.options?.map((option) => ({
          color: null,
          group: (option.group ?? null) as null,
          id: option.id,
          value: option.value,
        })) ?? null,
      required: false,
      type: PROPERTIES.find((candidate) => candidate.key === property.key)?.type ?? DatabasePropertyType.RICH_TEXT,
    }));
    return listPageViewRowsInReadingOrder(
      { ...EMPTY_PAGE_VIEW_CONFIGURATION, ...configuration },
      definitions,
      rows.rows.map((row) => ({ id: row.id, order: row.order, propertyValues: row.propertyValues ?? {} })),
    ).map((row) => row.id);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `query-admin-${stamp}@test.com`;
    const workerEmail = `query-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Query Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Query Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: workerEmail }).update({ role: 'WORKER' });
    const admin = await loginUser(testApp, adminEmail, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    const worker = await loginUser(testApp, workerEmail, PASSWORD);
    workerToken = worker.accessToken;
    workerId = worker.user.id;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as(adminToken))
      .send({ name: 'Query', slug: `query-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    await prisma.models.WorkspaceMember.createAndCount([{ role: 'WORKER', userId: workerId, workspaceId }], {
      onConflict: 'skip',
    });
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({
        content: {
          content: [{ content: [{ text: 'Work', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Work',
      });
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set(as(adminToken))
      .send({
        properties: PROPERTIES,
        views: [
          { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
          { configuration: {}, isDefault: false, name: 'Table', type: DatabaseViewType.TABLE },
        ],
      })
      .expect(201);
    schema = defined.body as SchemaResponse;
    const rows: [string, Record<string, unknown>][] = [
      [
        'r01',
        {
          due: { start: '2026-03-01' },
          points: 3,
          priority: optionId('priority', 'low'),
          tags: [optionId('tags', 'a')],
        },
      ],
      [
        'r02',
        {
          done: true,
          owner: [adminId],
          points: 8,
          priority: optionId('priority', 'high'),
          tags: [optionId('tags', 'a'), optionId('tags', 'b')],
        },
      ],
      [
        'r03',
        {
          due: { end: '2026-03-12', start: '2026-03-10' },
          owner: [workerId],
          points: 1,
          priority: optionId('priority', 'mid'),
        },
      ],
      ['r04', { owner: [adminId, workerId], points: 5, status: statusId('COMPLETE'), tags: [optionId('tags', 'c')] }],
      [
        'r05',
        {
          due: { start: '2026-04-01' },
          points: 5,
          priority: optionId('priority', 'high'),
          status: statusId('IN_PROGRESS'),
        },
      ],
      ['r06', { done: false, tags: [optionId('tags', 'b')] }],
      ['r07', { due: { start: '2026-03-10' }, owner: [workerId], points: 13, priority: optionId('priority', 'low') }],
      ['r08', {}],
      [
        'r09',
        {
          points: 2,
          priority: optionId('priority', 'mid'),
          status: statusId('COMPLETE'),
          tags: [optionId('tags', 'a'), optionId('tags', 'c')],
        },
      ],
      ['r10', { due: { start: '2026-02-20' }, points: 21, priority: optionId('priority', 'high') }],
    ];
    for (const [title, values] of rows) await createRow(title, values);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('rows in the order the shared engine gives them', () => {
    const condition = (propertyKey: string, operator: string, value: unknown): PageFilter =>
      ({ kind: 'CONDITION', operator, propertyKey, value }) as PageFilter;
    const group = (operator: 'AND' | 'OR', ...conditions: PageFilter[]): PageFilter => ({
      conditions,
      kind: 'GROUP',
      operator,
    });
    const sorted = (propertyKey: string, direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING'): PageSort => ({
      direction,
      propertyKey,
    });

    const filters: [string, () => PageFilter][] = [
      ['a status is one option', () => condition('status', 'IS', statusId('COMPLETE'))],
      ['a status is in a group', () => condition('status', 'IS_IN_GROUP', 'COMPLETE')],
      ['a status is not in a group', () => condition('status', 'IS_NOT_IN_GROUP', 'TO_DO')],
      ['a select is an option', () => condition('priority', 'IS', optionId('priority', 'high'))],
      ['a select is not an option', () => condition('priority', 'IS_NOT', optionId('priority', 'high'))],
      ['a number is greater', () => condition('points', 'IS_GREATER_THAN', 4)],
      ['a number is less', () => condition('points', 'IS_LESS_THAN', 5)],
      ['a number is', () => condition('points', 'IS', 5)],
      ['a number is empty', () => condition('points', 'IS_EMPTY', null)],
      ['a number is not empty', () => condition('points', 'IS_NOT_EMPTY', null)],
      ['a person list contains someone', () => condition('owner', 'CONTAINS', adminId)],
      ['a person list does not contain someone', () => condition('owner', 'NOT_CONTAINS', workerId)],
      ['a person list is empty', () => condition('owner', 'IS_EMPTY', null)],
      ['a multi select contains an option', () => condition('tags', 'CONTAINS', optionId('tags', 'a'))],
      ['a multi select does not contain an option', () => condition('tags', 'NOT_CONTAINS', optionId('tags', 'b'))],
      ['a date is a day inside a range', () => condition('due', 'IS', '2026-03-11')],
      ['a date is a day', () => condition('due', 'IS', '2026-03-10')],
      ['a date is before', () => condition('due', 'IS_BEFORE', '2026-03-10')],
      ['a date is after', () => condition('due', 'IS_AFTER', '2026-03-12')],
      ['a date is empty', () => condition('due', 'IS_EMPTY', null)],
      ['a checkbox is checked', () => condition('done', 'IS', true)],
      ['a checkbox is not checked', () => condition('done', 'IS', false)],
      [
        'both of two conditions',
        () =>
          group(
            'AND',
            condition('points', 'IS_GREATER_THAN', 2),
            condition('priority', 'IS', optionId('priority', 'high')),
          ),
      ],
      [
        'either of two conditions',
        () => group('OR', condition('points', 'IS_LESS_THAN', 2), condition('tags', 'CONTAINS', optionId('tags', 'c'))),
      ],
      [
        'a group inside a group',
        () =>
          group(
            'AND',
            condition('points', 'IS_NOT_EMPTY', null),
            group('OR', condition('done', 'IS', true), condition('owner', 'CONTAINS', workerId)),
          ),
      ],
    ];

    it.each(filters)('filters rows when %s', async (_name, build) => {
      const filter = build();

      const found = await readAll({ quickFilter: filter });

      expect(found).toEqual(await oracleIds({ filter }));
    });

    const orders: [string, PageSort[]][] = [
      ['by a number ascending', [sorted('points')]],
      ['by a number descending', [sorted('points', 'DESCENDING')]],
      ['by the position of a select option', [sorted('priority')]],
      ['by the position of a select option, descending', [sorted('priority', 'DESCENDING')]],
      ['by the group of a status and its position', [sorted('status')]],
      ['by a date', [sorted('due')]],
      ['by a date, descending', [sorted('due', 'DESCENDING')]],
      ['by a multi select', [sorted('tags')]],
      ['by a person list', [sorted('owner')]],
      ['by a checkbox, checked first', [sorted('done', 'DESCENDING')]],
      ['by two properties', [sorted('priority'), sorted('points', 'DESCENDING')]],
    ];

    it.each(orders)('orders rows %s', async (_name, sorts) => {
      const found = await readAll({ sorts });

      expect(found).toEqual(await oracleIds({ sorts }));
    });

    it('filters and orders together, a page at a time', async () => {
      const filter = condition('points', 'IS_GREATER_THAN', 1);
      const sorts = [sorted('points', 'DESCENDING')];

      const found = await readAll({ quickFilter: filter, sorts }, 3);

      expect(found).toEqual(await oracleIds({ filter, sorts }));
    });
  });

  describe('pages and cursors', () => {
    it('hands back the rows once each, with no cursor at the end', async () => {
      const all = await readAll({}, 3);

      expect(new Set(all).size).toBe(10);
      expect(all).toEqual(await oracleIds({}));
    });

    it('refuses a cursor that belongs to another order', async () => {
      const first = await ask({
        reducers: [{ id: 'rows', kind: 'results', limit: 2 }],
        sorts: [{ direction: 'ASCENDING', propertyKey: 'points' }],
      });
      const outcome = outcomeOf(first, 'rows');
      if (outcome.kind !== 'results' || outcome.nextCursor === null) throw new Error('no cursor');

      const stale = await query({
        reducers: [{ cursor: outcome.nextCursor, id: 'rows', kind: 'results', limit: 2 }],
        sorts: [{ direction: 'DESCENDING', propertyKey: 'points' }],
      });

      expect(stale.status).toBe(409);
      expect((stale.body as { error: { code: string } }).error.code).toBe('VIEW_QUERY_CURSOR_STALE');
    });

    it('returns the record of each row once, whatever reducers name it', async () => {
      const response = await ask({
        reducers: [
          { id: 'one', kind: 'results', limit: 3 },
          { id: 'two', kind: 'results', limit: 3 },
        ],
      });

      expect(Object.keys(response.rows)).toHaveLength(3);
    });
  });

  describe('groups', () => {
    it('lists the groups of a status with their first rows and a cursor for the rest', async () => {
      const response = await ask({
        reducers: [{ groupBy: 'status', id: 'groups', kind: 'groups', rowsPerGroup: 2 }],
      });

      const groups = outcomeOf(response, 'groups');
      if (groups.kind !== 'groups') throw new Error('not groups');
      const total = groups.groups.reduce((sum, entry) => sum + entry.ids.length, 0);
      expect(groups.groups.map((entry) => entry.key)).toHaveLength(3);
      expect(total).toBeGreaterThan(0);
      expect(groups.groups.some((entry) => entry.nextCursor !== null)).toBe(true);
    });

    it('counts rows per group in a second, separate reducer, and the counts add up', async () => {
      const response = await ask({
        reducers: [
          {
            by: 'GROUP',
            groupBy: 'priority',
            id: 'counts',
            items: [{ calculation: 'COUNT_ALL', id: 'rows', propertyKey: null }],
            kind: 'aggregations',
          },
        ],
      });

      const counts = outcomeOf(response, 'counts');
      if (counts.kind !== 'aggregations') throw new Error('not aggregations');
      const byGroup = Object.fromEntries(counts.groups.map((entry) => [entry.key, entry.values.rows]));
      expect(byGroup[optionId('priority', 'high')]).toBe(3);
      expect(byGroup[optionId('priority', 'low')]).toBe(2);
      expect(byGroup[optionId('priority', 'mid')]).toBe(2);
      expect(byGroup.unassigned).toBe(3);
      expect(counts.totals.rows).toBe(10);
    });

    it('puts a row in every group of a multi select and counts it once overall', async () => {
      const response = await ask({
        reducers: [
          {
            by: 'GROUP',
            groupBy: 'tags',
            id: 'counts',
            items: [{ calculation: 'COUNT_ALL', id: 'rows', propertyKey: null }],
            kind: 'aggregations',
          },
        ],
      });

      const counts = outcomeOf(response, 'counts');
      if (counts.kind !== 'aggregations') throw new Error('not aggregations');
      const byGroup = Object.fromEntries(counts.groups.map((entry) => [entry.key, entry.values.rows]));
      expect(byGroup[optionId('tags', 'a')]).toBe(3);
      expect(byGroup[optionId('tags', 'b')]).toBe(2);
      expect(byGroup[optionId('tags', 'c')]).toBe(2);
      expect(counts.distinctRowCount).toBe(10);
    });

    it('reads the rows of one group page by page', async () => {
      const high = optionId('priority', 'high');
      const first = await ask({
        reducers: [{ group: { key: high }, groupBy: 'priority', id: 'column', kind: 'groupResults', limit: 2 }],
      });
      const page = outcomeOf(first, 'column');
      if (page.kind !== 'results' || page.nextCursor === null) throw new Error('no more');

      const second = await ask({
        reducers: [
          {
            cursor: page.nextCursor,
            group: { key: high },
            groupBy: 'priority',
            id: 'column',
            kind: 'groupResults',
            limit: 2,
          },
        ],
      });

      const rest = outcomeOf(second, 'column');
      if (rest.kind !== 'results') throw new Error('not results');
      expect([...page.ids, ...rest.ids]).toHaveLength(3);
      expect(rest.nextCursor).toBeNull();
    });
  });

  describe('aggregations', () => {
    it('sums, averages and takes the extremes of a number over the rows that pass the filter', async () => {
      const response = await ask({
        quickFilter: { conditions: [], kind: 'GROUP', operator: 'AND' },
        reducers: [
          {
            by: 'NONE',
            id: 'totals',
            items: [
              { calculation: 'SUM', id: 'sum', propertyKey: 'points' },
              { calculation: 'AVERAGE', id: 'average', propertyKey: 'points' },
              { calculation: 'MINIMUM', id: 'minimum', propertyKey: 'points' },
              { calculation: 'MAXIMUM', id: 'maximum', propertyKey: 'points' },
              { calculation: 'MEDIAN', id: 'median', propertyKey: 'points' },
              { calculation: 'COUNT_FILLED', id: 'filled', propertyKey: 'points' },
              { calculation: 'COUNT_EMPTY', id: 'empty', propertyKey: 'points' },
              { calculation: 'PERCENT_CHECKED', id: 'checked', propertyKey: 'done' },
              { calculation: 'PERCENT_FILLED', id: 'filledPortion', propertyKey: 'points' },
              { calculation: 'PERCENT_EMPTY', id: 'emptyPortion', propertyKey: 'points' },
            ],
            kind: 'aggregations',
          },
        ],
      });

      const totals = outcomeOf(response, 'totals');
      if (totals.kind !== 'aggregations') throw new Error('not aggregations');
      expect(totals.totals).toMatchObject({ empty: 2, filled: 8, maximum: 21, minimum: 1, sum: 58 });
      expect(totals.totals.average).toBeCloseTo(58 / 8);
      expect(totals.totals.median).toBe(5);
      expect(totals.totals.checked).toBeCloseTo(0.1);
      expect(totals.totals.filledPortion).toBeCloseTo(0.8);
      expect(totals.totals.emptyPortion).toBeCloseTo(0.2);
    });
  });

  describe('search', () => {
    it('finds rows by their title', async () => {
      const found = await readAll({ search: 'r0' }, 20);

      expect(found).toHaveLength(9);
    });
  });

  describe('how a view groups', () => {
    const viewNamed = (name: string): { id: string; version: number } => {
      const view = schema.views.find((candidate) => candidate.name === name);
      if (view === undefined) throw new Error(`No view ${name}`);
      return view;
    };

    const configure = async (name: string, configuration: Record<string, unknown>): Promise<string> => {
      const { id } = viewNamed(name);
      await prisma.models.PageSchemaView.where({ id }).update({
        configuration: z.json().parse(configuration),
      });
      return id;
    };

    it('leaves out the groups the view hides, unless they are asked for, and says which they are', async () => {
      const viewId = await configure('Board', { groupBy: 'status', hiddenGroups: [statusId('COMPLETE')] });

      const shown = outcomeOf(await ask({ reducers: [{ id: 'groups', kind: 'groups' }], viewId }), 'groups');
      const everything = outcomeOf(
        await ask({ reducers: [{ id: 'groups', includeHidden: true, kind: 'groups' }], viewId }),
        'groups',
      );

      if (shown.kind !== 'groups' || everything.kind !== 'groups') throw new Error('not groups');
      expect(shown.groups.map((group) => group.key)).not.toContain(statusId('COMPLETE'));
      expect(everything.groups.find((group) => group.key === statusId('COMPLETE'))?.isHidden).toBe(true);
      expect(everything.groups.filter((group) => group.isHidden)).toHaveLength(1);
    });

    it('draws a cell for every column and band when the view has a second grouping', async () => {
      const viewId = await configure('Board', { groupBy: 'status', subGroupBy: 'priority' });

      const outcome = outcomeOf(await ask({ reducers: [{ id: 'cells', kind: 'groups' }], viewId }), 'cells');

      if (outcome.kind !== 'groups') throw new Error('not groups');
      const bands = new Set(outcome.groups.map((cell) => cell.subKey));
      expect(bands).toEqual(
        new Set([optionId('priority', 'low'), optionId('priority', 'mid'), optionId('priority', 'high'), 'unassigned']),
      );
      expect(outcome.groups).toHaveLength(3 * 4);
      const placed = outcome.groups.reduce((sum, cell) => sum + cell.ids.length, 0);
      expect(placed).toBe(10);
    });

    it('groups a status by its three groups when the view asks for it', async () => {
      const viewId = await configure('Board', { groupBy: 'status', groupByMode: 'GROUP' });

      const outcome = outcomeOf(await ask({ reducers: [{ id: 'groups', kind: 'groups' }], viewId }), 'groups');

      if (outcome.kind !== 'groups') throw new Error('not groups');
      expect(outcome.groups.map((group) => group.key)).toEqual([...PAGE_STATUS_GROUP_VALUES]);
      expect(outcome.groups.reduce((sum, group) => sum + group.ids.length, 0)).toBe(10);
    });

    it('answers the version of the view it read, which rises with each change to it', async () => {
      const viewId = viewNamed('Table').id;
      const before = (await ask({ reducers: [{ id: 'rows', kind: 'results', limit: 1 }], viewId })).viewVersion;

      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/views/${viewId}/operations`)
        .set(as(adminToken))
        .send({ operations: [{ args: true, command: 'set', path: ['configuration', 'wrapsText'] }] })
        .expect(200);
      const after = (await ask({ reducers: [{ id: 'rows', kind: 'results', limit: 1 }], viewId })).viewVersion;

      expect(before).not.toBeNull();
      expect(after).toBe((before ?? 0) + 1);
      expect((await ask({ reducers: [{ id: 'rows', kind: 'results', limit: 1 }] })).viewVersion).toBeNull();
    });
  });

  describe('a collection with more closed rows than a query can leave out', () => {
    it('refuses to count, with an error that says why, instead of counting wrongly', async () => {
      const page = await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages`)
        .set(as(adminToken))
        .send({
          content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
          title: 'Closed rows',
        })
        .expect(201);
      const crowded = (page.body as { id: string }).id;
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${crowded}/schema`)
        .set(as(adminToken))
        .send({ properties: [TITLE], views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }] })
        .expect(201);
      const closed = Array.from({ length: 5001 }, (_unused, position) => ({
        createdById: adminId,
        editedById: adminId,
        id: crypto.randomUUID(),
        parentId: crowded,
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: 'full' }],
        properties: {},
        spaceId,
        text: `Closed ${String(position)}`,
        type: 'page',
      }));
      await prisma.models.Block.createAndCount(closed);

      const response = await query({ reducers: [{ id: 'rows', kind: 'results' }] }, workerToken, crowded);

      expect(response.status).toBe(422);
      expect((response.body as { error: { code: string } }).error.code).toBe('VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS');
    });
  });

  describe('a reader who cannot open a row', () => {
    it('does not count it, list it or aggregate it, and sees the same totals everywhere', async () => {
      const hidden = (await readAll({}, 20)).at(0) ?? '';
      await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set(as(adminToken))
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                {
                  args: { permissions: [{ principal: { kind: 'user', userId: adminId }, role: 'full' }] },
                  command: 'setPermission',
                  path: [],
                  pointer: { id: hidden, table: 'block' },
                },
              ],
              spaceId,
            },
          ],
        })
        .expect(200);

      const response = await ask(
        {
          reducers: [
            { id: 'rows', kind: 'results', limit: 100 },
            {
              by: 'NONE',
              id: 'counts',
              items: [{ calculation: 'COUNT_ALL', id: 'rows', propertyKey: null }],
              kind: 'aggregations',
            },
            {
              by: 'GROUP',
              groupBy: 'priority',
              id: 'byGroup',
              items: [{ calculation: 'COUNT_ALL', id: 'rows', propertyKey: null }],
              kind: 'aggregations',
            },
          ],
        },
        workerToken,
      );

      const rows = outcomeOf(response, 'rows');
      const counts = outcomeOf(response, 'counts');
      const byGroup = outcomeOf(response, 'byGroup');
      if (rows.kind !== 'results' || counts.kind !== 'aggregations' || byGroup.kind !== 'aggregations') {
        throw new Error('unexpected outcomes');
      }
      expect(rows.ids).not.toContain(hidden);
      expect(rows.ids).toHaveLength(9);
      expect(counts.totals.rows).toBe(9);
      expect(byGroup.groups.reduce((sum, entry) => sum + Number(entry.values.rows ?? 0), 0)).toBe(9);
      const asAdmin = await readAll({}, 20);
      expect(asAdmin).toContain(hidden);
    });
  });
});
