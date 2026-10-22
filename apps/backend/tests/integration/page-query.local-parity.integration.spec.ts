import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import type {
  PageFilter,
  PagePropertyValue,
  PageQueryAggregationItem,
  PageQueryOutcome,
  PageQueryReducer,
  PageQueryRequest,
  PageQueryResponse,
  PageViewProperty,
} from '@neuma/shared';
import { PAGE_VIEW_CALCULATION, readPageViewConfiguration, runLocalPageQuery } from '@neuma/shared';
import request from 'supertest';
import { PAGE_QUERY_CLOCK } from '@/modules/pages/constants/pages.constants';
import type { PageQueryClock } from '@/modules/pages/types/page-query.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaResponse {
  properties: { key: string; options?: { group?: null | string; id: string; value: string }[] | null }[];
  views: { configuration: Record<string, unknown>; id: string; name: string }[];
}

const PASSWORD = 'plainPassword123';

const ROW_COUNT = 130;

const NOW = '2026-10-26T02:30:00Z';

const ZONES = ['UTC', 'America/Santiago', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'] as const;

const PROPERTIES = [
  { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE },
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
  { key: 'tags', label: 'Tags', options: ['a', 'b', 'c'], required: false, type: DatabasePropertyType.MULTI_SELECT },
  { key: 'due', label: 'Due', options: null, required: false, type: DatabasePropertyType.DATE },
  { key: 'done', label: 'Done', options: null, required: false, type: DatabasePropertyType.CHECKBOX },
  { key: 'createdAt', label: 'Created', options: null, required: false, type: DatabasePropertyType.CREATED_TIME },
];

const condition = (propertyKey: string, operator: string, value: unknown): PageFilter =>
  ({ kind: 'CONDITION', operator, propertyKey, value }) as PageFilter;

const VIEWS: readonly { readonly configuration: Record<string, unknown>; readonly name: string }[] = [
  { configuration: {}, name: 'Plain' },
  { configuration: { groupBy: 'priority' }, name: 'By priority' },
  { configuration: { groupBy: 'tags', hidesEmptyGroups: true }, name: 'By tags' },
  { configuration: { groupBy: 'status' }, name: 'By status' },
  { configuration: { groupBy: 'status', groupByMode: 'GROUP' }, name: 'By status group' },
  { configuration: { groupBy: 'done' }, name: 'By done' },
  { configuration: { groupBy: 'priority', subGroupBy: 'done' }, name: 'Banded' },
  { configuration: { groupBy: 'priority', hiddenGroups: ['mid'], hidesUnassignedColumn: true }, name: 'Hidden' },
  {
    configuration: {
      filter: { conditions: [condition('points', 'IS_GREATER_THAN', 3)], kind: 'GROUP', operator: 'AND' },
      sorts: [
        { direction: 'DESCENDING', propertyKey: 'points' },
        { direction: 'ASCENDING', propertyKey: 'priority' },
      ],
    },
    name: 'Filtered and sorted',
  },
  {
    configuration: { groupBy: 'tags', sorts: [{ direction: 'ASCENDING', propertyKey: 'due' }] },
    name: 'Tags by due',
  },
];

const ITEMS: readonly PageQueryAggregationItem[] = [
  { calculation: PAGE_VIEW_CALCULATION.COUNT_ALL, id: 'count', propertyKey: null },
  { calculation: PAGE_VIEW_CALCULATION.SUM, id: 'sum', propertyKey: 'points' },
  { calculation: PAGE_VIEW_CALCULATION.AVERAGE, id: 'average', propertyKey: 'points' },
  { calculation: PAGE_VIEW_CALCULATION.MINIMUM, id: 'minimum', propertyKey: 'points' },
  { calculation: PAGE_VIEW_CALCULATION.MAXIMUM, id: 'maximum', propertyKey: 'points' },
  { calculation: PAGE_VIEW_CALCULATION.MEDIAN, id: 'median', propertyKey: 'points' },
  { calculation: PAGE_VIEW_CALCULATION.COUNT_FILLED, id: 'filled', propertyKey: 'owner' },
  { calculation: PAGE_VIEW_CALCULATION.COUNT_EMPTY, id: 'empty', propertyKey: 'due' },
  { calculation: PAGE_VIEW_CALCULATION.PERCENT_CHECKED, id: 'checked', propertyKey: 'done' },
];

/** A fixed pseudo-random series, so every run builds the same collection. */
const makeRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const sortKey = (group: { readonly key: string; readonly subKey: null | string }): string =>
  JSON.stringify([group.key, group.subKey]);

/** A cursor is opaque and each side writes its own; what must agree is whether there is more to read. */
const normalizeOutcome = (outcome: PageQueryOutcome): unknown => {
  switch (outcome.kind) {
    case 'results':
      return { ...outcome, nextCursor: outcome.nextCursor !== null };
    case 'groups':
      return {
        ...outcome,
        groups: outcome.groups.map((group) => ({ ...group, nextCursor: group.nextCursor !== null })),
      };
    default:
      return {
        ...outcome,
        groups: outcome.groups.toSorted((left, right) => sortKey(left).localeCompare(sortKey(right))),
      };
  }
};

const normalizeOutcomes = (outcomes: Readonly<Record<string, PageQueryOutcome>>): unknown =>
  Object.fromEntries(Object.entries(outcomes).map(([id, outcome]) => [id, normalizeOutcome(outcome)]));

const roundNumbers = (value: unknown): unknown => {
  if (typeof value === 'number') return Math.round(value * 1_000_000) / 1_000_000;
  if (Array.isArray(value)) return value.map(roundNumbers);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundNumbers(entry)]));
  }
  return value;
};

describe('Querying in the browser and in the server (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let workerId: string;
  let spaceId: string;
  let collectionId: string;
  let schema: SchemaResponse;
  let viewProperties: readonly PageViewProperty[];

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const ask = async (body: PageQueryRequest, token = adminToken): Promise<PageQueryResponse> =>
    (
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`)
        .set(as(token))
        .send(body)
        .expect(200)
    ).body as PageQueryResponse;

  const viewNamed = (name: string) => {
    const view = schema.views.find((candidate) => candidate.name === name);
    if (view === undefined) throw new Error(`No view ${name}`);
    return view;
  };

  const optionId = (key: string, name: string): string => {
    const option = schema.properties.find((property) => property.key === key)?.options?.find((o) => o.value === name);
    if (option === undefined) throw new Error(`No option ${name} in ${key}`);
    return option.id;
  };

  /** Every row of the collection in its manual order: what the browser would hold in client mode. */
  const readEveryRow = async (token = adminToken) => {
    const response = await ask(
      { reducers: [{ id: 'rows', kind: 'results', limit: 1000 }], sorts: [], viewId: viewNamed('Plain').id },
      token,
    );
    const outcome = response.reducers.rows;
    if (outcome?.kind !== 'results') throw new Error('not results');
    return {
      ids: outcome.ids,
      rows: outcome.ids.flatMap((id) => {
        const row = response.rows[id];
        return row === undefined ? [] : [{ id, propertyValues: row.propertyValues, title: row.title }];
      }),
    };
  };

  const setNow = (iso: string): void => {
    Object.assign(testApp.module.get<PageQueryClock>(PAGE_QUERY_CLOCK), { now: () => new Date(iso) });
  };

  const compare = async (
    viewName: string,
    reducers: readonly PageQueryReducer[],
    options: {
      readonly quickFilter?: PageFilter;
      readonly timeZone?: string;
      readonly token?: string;
      readonly viewerId?: string;
    } = {},
  ): Promise<void> => {
    const view = viewNamed(viewName);
    const token = options.token ?? adminToken;
    const timeZone = options.timeZone ?? 'UTC';
    const served = await ask(
      {
        reducers,
        ...(options.quickFilter === undefined ? {} : { quickFilter: options.quickFilter }),
        timeZone,
        viewId: view.id,
      },
      token,
    );
    const held = await readEveryRow(token);
    const local = runLocalPageQuery({
      configuration: readPageViewConfiguration(view.configuration),
      context: { now: Date.parse(NOW), timeZone, viewerId: options.viewerId ?? adminId },
      properties: viewProperties,
      request: { ...(options.quickFilter === undefined ? {} : { quickFilter: options.quickFilter }), reducers },
      rows: held.rows,
    });
    if (local.isFail()) throw new Error(`The browser refused: ${local.getError()}`);
    expect(roundNumbers(normalizeOutcomes(local.getValue()))).toEqual(roundNumbers(normalizeOutcomes(served.reducers)));
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `local-admin-${stamp}@test.com`;
    const workerEmail = `local-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Local Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Local Worker', password: PASSWORD });
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
      .send({ name: 'Local', slug: `local-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
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
          content: [{ content: [{ text: 'Local', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Local',
      });
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set(as(adminToken))
      .send({
        properties: PROPERTIES,
        views: VIEWS.map((view, position) => ({
          configuration: view.configuration,
          isDefault: position === 0,
          name: view.name,
          type: DatabaseViewType.TABLE,
        })),
      })
      .expect(201);
    schema = defined.body as SchemaResponse;
    viewProperties = schema.properties.map((property) => ({
      key: property.key,
      options:
        property.options?.map((option) => ({
          color: null,
          group: (option.group ?? null) as null,
          id: option.id,
          value: option.value,
        })) ?? null,
      type: (PROPERTIES.find((candidate) => candidate.key === property.key)?.type ?? 'RICH_TEXT') as never,
    }));
    const random = makeRandom(42);
    const pick = <Item>(items: readonly Item[]): Item =>
      items[Math.floor(random() * items.length)] ?? (items[0] as Item);
    const statuses = schema.properties.find((property) => property.key === 'status')?.options ?? [];
    for (let position = 0; position < ROW_COUNT; position += 1) {
      const values: Record<string, PagePropertyValue> = {};
      if (random() < 0.8) values.priority = optionId('priority', pick(['low', 'mid', 'high']));
      if (random() < 0.7) values.points = Math.floor(random() * 20);
      if (random() < 0.8) values.status = pick(statuses).id;
      if (random() < 0.6)
        values.tags = [...new Set([pick(['a', 'b', 'c']), pick(['a', 'b', 'c'])])].map((n) => optionId('tags', n));
      if (random() < 0.5) values.done = random() < 0.5;
      if (random() < 0.5) values.owner = random() < 0.5 ? [adminId] : [adminId, workerId];
      if (random() < 0.6) values.due = { start: `2026-10-${String(20 + Math.floor(random() * 12)).padStart(2, '0')}` };
      const title = `row ${String(position)}`;
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages`)
        .set(as(adminToken))
        .send({
          content: {
            content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
            schemaVersion: 1,
            type: 'doc',
          },
          parentId: collectionId,
          propertyValues: values,
          title,
        })
        .expect(201);
    }
    setNow(NOW);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('reads a collection of more than a hundred rows in one page of ids', async () => {
    const held = await readEveryRow();

    expect(held.ids).toHaveLength(ROW_COUNT);
  });

  it('gives every row the version of its block, which grows when the row is edited', async () => {
    const first = await ask({
      reducers: [{ id: 'rows', kind: 'results', limit: 3 }],
      sorts: [],
      viewId: viewNamed('Plain').id,
    });
    const outcome = first.reducers.rows;
    if (outcome?.kind !== 'results') throw new Error('not results');
    const rowId = outcome.ids[0] ?? '';
    const block = await prisma.models.Block.where({ id: rowId }).first();

    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${rowId}/properties`)
      .set(as(adminToken))
      .send({ propertyValues: { points: 99 } })
      .expect(200);
    const second = await ask({
      reducers: [{ id: 'rows', kind: 'results', limit: 3 }],
      sorts: [],
      viewId: viewNamed('Plain').id,
    });

    expect(first.rows[rowId]?.version).toBe(block?.version);
    expect(second.rows[rowId]?.version).toBeGreaterThan(first.rows[rowId]?.version ?? Number.POSITIVE_INFINITY);
  });

  it('refuses a page of more ids than a response carries', async () => {
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`)
      .set(as(adminToken))
      .send({ reducers: [{ id: 'rows', kind: 'results', limit: 1001 }] })
      .expect(400);
  });

  describe.each(VIEWS.map((view) => view.name))('the view %s', (name) => {
    it('lists the same rows in the same order', async () => {
      await compare(name, [{ id: 'rows', kind: 'results', limit: 1000 }]);
    });

    it('pages the same way', async () => {
      await compare(name, [{ id: 'rows', kind: 'results', limit: 7 }]);
    });

    it('counts and totals the same', async () => {
      await compare(name, [
        { by: 'NONE', id: 'totals', items: [...ITEMS], kind: 'aggregations' },
        ...(viewNamed(name).configuration.groupBy === undefined
          ? []
          : ([{ by: 'GROUP', id: 'counts', items: [...ITEMS], kind: 'aggregations' }] as const)),
      ]);
    });

    it('makes the same groups with the same first rows', async () => {
      if (viewNamed(name).configuration.groupBy === undefined) return;
      await compare(name, [{ id: 'groups', kind: 'groups', rowsPerGroup: 5 }]);
    });
  });

  describe('a quick filter, a viewer and a zone', () => {
    const cases: readonly (readonly [string, PageFilter])[] = [
      ['people contain me', condition('owner', 'CONTAINS', '@me')],
      ['a date is today', condition('due', 'IS', '@today')],
      ['a date is this week', condition('due', 'IS', '@this_week')],
      ['a date is on or after yesterday', condition('due', 'IS_ON_OR_AFTER', '@yesterday')],
      ['a creation time is before today', condition('createdAt', 'IS_BEFORE', '@today')],
      ['points are greater', condition('points', 'IS_GREATER_THAN', 9)],
      ['a tag is not there', condition('tags', 'NOT_CONTAINS', '@none')],
    ];
    const everyCase = ZONES.flatMap((zone) =>
      cases.map(([title, filter]) => [`${title} in ${zone}`, zone, filter] as const),
    );

    it.each(everyCase)('agrees row for row when %s', async (_title, zone, filter) => {
      const quickFilter =
        filter.kind === 'CONDITION' && filter.propertyKey === 'tags'
          ? condition('tags', 'NOT_CONTAINS', optionId('tags', 'a'))
          : filter;
      const reducers = [{ id: 'rows', kind: 'results', limit: 1000 }] as const;

      await compare('By priority', reducers, { quickFilter, timeZone: zone });
      await compare('By priority', reducers, { quickFilter, timeZone: zone, token: workerToken, viewerId: workerId });
    });
  });

  it('agrees on the groups of the whole collection under a quick filter', async () => {
    await compare('Banded', [{ id: 'groups', kind: 'groups', rowsPerGroup: 50 }], {
      quickFilter: condition('points', 'IS_GREATER_THAN', 4),
    });
  });
});
