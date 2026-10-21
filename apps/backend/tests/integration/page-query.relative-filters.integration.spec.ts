import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import type {
  PageFilter,
  PagePropertyValue,
  PageQueryOutcome,
  PageQueryRequest,
  PageQueryResponse,
  PageViewProperty,
} from '@neuma/shared';
import { matchesPageFilter, resolvePageFilter, withPageDerivedValues } from '@neuma/shared';
import request from 'supertest';
import { PAGE_QUERY_CLOCK } from '@/modules/pages/constants/pages.constants';
import type { PageQueryClock } from '@/modules/pages/types/page-query.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaResponse {
  views: { id: string; name: string }[];
}

interface RowSeed {
  readonly createdAt: string;
  readonly createdBy: 'admin' | 'worker';
  readonly due?: { end?: string; start: string };
  readonly owner?: ('admin' | 'worker')[];
  readonly title: string;
}

const PASSWORD = 'plainPassword123';

const SANTIAGO = 'America/Santiago';

const KIRITIMATI = 'Pacific/Kiritimati';

const PROPERTIES = [
  { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE },
  { key: 'due', label: 'Due', options: null, required: false, type: DatabasePropertyType.DATE },
  {
    config: { allowsMultiple: true },
    key: 'owner',
    label: 'Owner',
    options: null,
    required: false,
    type: DatabasePropertyType.PERSON,
  },
  { key: 'createdAt', label: 'Created', options: null, required: false, type: DatabasePropertyType.CREATED_TIME },
  { key: 'author', label: 'Author', options: null, required: false, type: DatabasePropertyType.CREATED_BY },
];

const VIEW_PROPERTIES: readonly PageViewProperty[] = [
  { key: 'title', type: 'TITLE' },
  { key: 'due', type: 'DATE' },
  { key: 'owner', type: 'PERSON' },
  { key: 'createdAt', type: 'CREATED_TIME' },
  { key: 'author', type: 'CREATED_BY' },
];

const condition = (propertyKey: string, operator: string, value: unknown): PageFilter =>
  ({ kind: 'CONDITION', operator, propertyKey, value }) as PageFilter;

/** The moment is the Monday 26 of October 2026 for UTC and still the Sunday 25 for Santiago. */
const AROUND_THE_TURN_OF_THE_WEEK = '2026-10-26T02:30:00Z';

const ROWS: readonly RowSeed[] = [
  {
    createdAt: '2026-10-19T15:00:00Z',
    createdBy: 'admin',
    due: { start: '2026-10-19' },
    owner: ['admin'],
    title: 'monday',
  },
  {
    createdAt: '2026-10-24T15:00:00Z',
    createdBy: 'worker',
    due: { start: '2026-10-24' },
    owner: ['worker'],
    title: 'saturday',
  },
  {
    createdAt: '2026-10-25T20:00:00Z',
    createdBy: 'admin',
    due: { start: '2026-10-25' },
    owner: ['admin', 'worker'],
    title: 'sunday',
  },
  {
    createdAt: '2026-10-26T01:00:00Z',
    createdBy: 'worker',
    due: { start: '2026-10-26' },
    owner: ['worker'],
    title: 'next monday',
  },
  {
    createdAt: '2026-10-26T05:00:00Z',
    createdBy: 'admin',
    due: { start: '2026-11-01' },
    owner: ['admin'],
    title: 'next sunday',
  },
  {
    createdAt: '2026-10-27T05:00:00Z',
    createdBy: 'worker',
    due: { end: '2026-10-27', start: '2026-10-23' },
    title: 'a trip',
  },
  {
    createdAt: '2026-10-20T05:00:00Z',
    createdBy: 'admin',
    due: { start: '2026-10-26T02:59:00Z' },
    owner: ['worker'],
    title: 'just before midnight',
  },
  {
    createdAt: '2026-10-20T06:00:00Z',
    createdBy: 'worker',
    due: { start: '2026-10-26T03:00:00Z' },
    title: 'at midnight',
  },
  {
    createdAt: '2026-10-20T07:00:00Z',
    createdBy: 'admin',
    due: { end: '2026-10-26T04:00:00Z', start: '2026-10-25T10:00:00Z' },
    title: 'a long night',
  },
  { createdAt: '2026-10-21T07:00:00Z', createdBy: 'worker', title: 'undated' },
];

describe('Querying with relative dates and "me" (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let workerId: string;
  let spaceId: string;
  let collectionId: string;
  let schema: SchemaResponse;
  const idsByTitle = new Map<string, string>();

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const setNow = (iso: string): void => {
    Object.assign(testApp.module.get<PageQueryClock>(PAGE_QUERY_CLOCK), { now: () => new Date(iso) });
  };

  const query = (body: PageQueryRequest, token = adminToken) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`)
      .set(as(token))
      .send(body);

  const ask = async (body: Omit<PageQueryRequest, 'reducers'>, token = adminToken): Promise<PageQueryResponse> =>
    (await query({ ...body, reducers: [{ id: 'rows', kind: 'results', limit: 100 }] }, token).expect(200))
      .body as PageQueryResponse;

  const outcomeOf = (response: PageQueryResponse): PageQueryOutcome => {
    const outcome = response.reducers.rows;
    if (outcome === undefined) throw new Error('No outcome');
    return outcome;
  };

  const titlesOf = async (body: Omit<PageQueryRequest, 'reducers'>, token = adminToken): Promise<string[]> => {
    const response = await ask(body, token);
    const outcome = outcomeOf(response);
    if (outcome.kind !== 'results') throw new Error('not results');
    return outcome.ids.map((id) => response.rows[id]?.title ?? '').sort();
  };

  /** What the shared engine says for the same viewer, moment and zone: the other half of the parity. */
  const oracleTitles = async (filter: PageFilter, timeZone: string, viewerId: string): Promise<string[]> => {
    const everything = await ask({});
    const outcome = outcomeOf(everything);
    if (outcome.kind !== 'results') throw new Error('not results');
    const resolved = resolvePageFilter(filter, VIEW_PROPERTIES, {
      now: Date.parse(AROUND_THE_TURN_OF_THE_WEEK),
      timeZone,
      viewerId,
    });
    return outcome.ids
      .flatMap((id) => {
        const row = everything.rows[id];
        if (row === undefined) return [];
        const values = withPageDerivedValues(VIEW_PROPERTIES, row.propertyValues ?? {}, row);
        return matchesPageFilter(resolved, values, VIEW_PROPERTIES, { timeZone }) ? [row.title] : [];
      })
      .sort();
  };

  const userOf = (who: 'admin' | 'worker'): string => (who === 'admin' ? adminId : workerId);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `relative-admin-${stamp}@test.com`;
    const workerEmail = `relative-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Relative Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Relative Worker', password: PASSWORD });
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
      .send({ name: 'Relative', slug: `relative-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
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
          content: [{ content: [{ text: 'Tasks', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Tasks',
      });
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set(as(adminToken))
      .send({
        properties: PROPERTIES,
        views: [
          { configuration: {}, isDefault: true, name: 'Everything', type: DatabaseViewType.TABLE },
          {
            configuration: { filter: condition('owner', 'CONTAINS', '@me') },
            isDefault: false,
            name: 'Mine',
            type: DatabaseViewType.TABLE,
          },
          {
            configuration: { filter: condition('author', 'IS', '@me') },
            isDefault: false,
            name: 'Made by me',
            type: DatabaseViewType.TABLE,
          },
          {
            configuration: { filter: condition('due', 'IS', '@this_week') },
            isDefault: false,
            name: 'This week',
            type: DatabaseViewType.TABLE,
          },
        ],
      })
      .expect(201);
    schema = defined.body as SchemaResponse;
    for (const seed of ROWS) {
      const propertyValues: Record<string, PagePropertyValue> = {
        ...(seed.due === undefined ? {} : { due: seed.due }),
        ...(seed.owner === undefined ? {} : { owner: seed.owner.map(userOf) }),
      };
      const created = await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages`)
        .set(as(adminToken))
        .send({
          content: {
            content: [{ content: [{ text: seed.title, type: 'text' }], type: 'paragraph' }],
            schemaVersion: 1,
            type: 'doc',
          },
          parentId: collectionId,
          propertyValues,
          title: seed.title,
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      idsByTitle.set(seed.title, id);
      await prisma.models.Block.where({ id }).update({
        createdAt: new Date(seed.createdAt),
        createdById: userOf(seed.createdBy),
      });
    }
  });

  beforeEach(() => {
    setNow(AROUND_THE_TURN_OF_THE_WEEK);
  });

  afterAll(async () => {
    await testApp.close();
  });

  const viewId = (name: string): string => {
    const found = schema.views.find((view) => view.name === name);
    if (found === undefined) throw new Error(`No view ${name}`);
    return found.id;
  };

  describe('a date that moves with the day', () => {
    it('is this week for each viewer by their own calendar, across the turn of the week', async () => {
      const inSantiago = await titlesOf({ timeZone: SANTIAGO, viewId: viewId('This week') });
      const inUtc = await titlesOf({ timeZone: 'UTC', viewId: viewId('This week') });

      expect(inSantiago).toEqual(['a long night', 'a trip', 'just before midnight', 'monday', 'saturday', 'sunday']);
      expect(inUtc).toEqual([
        'a long night',
        'a trip',
        'at midnight',
        'just before midnight',
        'next monday',
        'next sunday',
      ]);
    });

    it('reads UTC when the request names no zone', async () => {
      expect(await titlesOf({ viewId: viewId('This week') })).toEqual(
        await titlesOf({ timeZone: 'UTC', viewId: viewId('This week') }),
      );
    });

    it('moves with the clock: the same view is another week a week later', async () => {
      setNow('2026-10-14T12:00:00Z');

      expect(await titlesOf({ timeZone: 'UTC', viewId: viewId('This week') })).toEqual([]);
    });

    it('is today, yesterday and tomorrow for the day of the viewer', async () => {
      const santiagoToday = await titlesOf({ quickFilter: condition('due', 'IS', '@today'), timeZone: SANTIAGO });
      const utcToday = await titlesOf({ quickFilter: condition('due', 'IS', '@today'), timeZone: 'UTC' });
      const santiagoTomorrow = await titlesOf({ quickFilter: condition('due', 'IS', '@tomorrow'), timeZone: SANTIAGO });
      const santiagoYesterday = await titlesOf({
        quickFilter: condition('due', 'IS', '@yesterday'),
        timeZone: SANTIAGO,
      });

      expect(santiagoToday).toEqual(['a long night', 'a trip', 'just before midnight', 'sunday']);
      expect(utcToday).toEqual(['a long night', 'a trip', 'at midnight', 'just before midnight', 'next monday']);
      expect(santiagoTomorrow).toEqual(['a long night', 'a trip', 'at midnight', 'next monday']);
      expect(santiagoYesterday).toEqual(['a trip', 'saturday']);
    });

    it('is overdue when it is before today, and counts a range by where it ends', async () => {
      const overdue = await titlesOf({ quickFilter: condition('due', 'IS_BEFORE', '@today'), timeZone: SANTIAGO });

      expect(overdue).toEqual(['monday', 'saturday']);
    });

    it('covers the next and the past N days, today included', async () => {
      const next = await titlesOf({ quickFilter: condition('due', 'IS', '@next_days:2'), timeZone: SANTIAGO });
      const past = await titlesOf({ quickFilter: condition('due', 'IS', '@past_days:2'), timeZone: SANTIAGO });

      expect(next).toEqual(['a long night', 'a trip', 'at midnight', 'just before midnight', 'next monday', 'sunday']);
      expect(past).toEqual(['a long night', 'a trip', 'just before midnight', 'saturday', 'sunday']);
    });

    it('reads a month and the day after or before a relative day', async () => {
      const lastMonth = await titlesOf({ quickFilter: condition('due', 'IS', '@last_month'), timeZone: SANTIAGO });
      const thisMonth = await titlesOf({ quickFilter: condition('due', 'IS', '@this_month'), timeZone: SANTIAGO });
      const onOrAfter = await titlesOf({
        quickFilter: condition('due', 'IS_ON_OR_AFTER', '@today'),
        timeZone: SANTIAGO,
      });
      const onOrBefore = await titlesOf({
        quickFilter: condition('due', 'IS_ON_OR_BEFORE', '@yesterday'),
        timeZone: SANTIAGO,
      });

      expect(lastMonth).toEqual([]);
      expect(thisMonth).toEqual([
        'a long night',
        'a trip',
        'at midnight',
        'just before midnight',
        'monday',
        'next monday',
        'saturday',
        'sunday',
      ]);
      expect(onOrAfter).toEqual([
        'a long night',
        'at midnight',
        'just before midnight',
        'next monday',
        'next sunday',
        'sunday',
      ]);
      expect(onOrBefore).toEqual(['monday', 'saturday']);
    });

    it('puts a block created in the evening on the day of the viewer, not the day in UTC', async () => {
      const created = condition('createdAt', 'IS', '@today');

      expect(await titlesOf({ quickFilter: created, timeZone: SANTIAGO })).toEqual(['next monday', 'sunday']);
      expect(await titlesOf({ quickFilter: created, timeZone: 'UTC' })).toEqual(['next monday', 'next sunday']);
    });
  });

  describe('"me" in a view saved by someone else', () => {
    it('shows each viewer the rows they own', async () => {
      const forAdmin = await titlesOf({ viewId: viewId('Mine') }, adminToken);
      const forWorker = await titlesOf({ viewId: viewId('Mine') }, workerToken);

      expect(forAdmin).toEqual(['monday', 'next sunday', 'sunday']);
      expect(forWorker).toEqual(['just before midnight', 'next monday', 'saturday', 'sunday']);
    });

    it('shows each viewer what they made', async () => {
      const forAdmin = await titlesOf({ viewId: viewId('Made by me') }, adminToken);
      const forWorker = await titlesOf({ viewId: viewId('Made by me') }, workerToken);

      expect(forAdmin).toEqual(['a long night', 'just before midnight', 'monday', 'next sunday', 'sunday']);
      expect(forWorker).toEqual(['a trip', 'at midnight', 'next monday', 'saturday', 'undated']);
    });

    it('counts per viewer as well as it lists', async () => {
      const counted = async (token: string): Promise<unknown> => {
        const response = (
          await query(
            {
              reducers: [
                {
                  by: 'NONE',
                  id: 'count',
                  items: [{ calculation: 'COUNT_ALL', id: 'all', propertyKey: null }],
                  kind: 'aggregations',
                },
              ],
              viewId: viewId('Mine'),
            },
            token,
          ).expect(200)
        ).body as PageQueryResponse;
        const outcome = response.reducers.count;
        return outcome?.kind === 'aggregations' ? outcome.totals.all : null;
      };

      expect(await counted(adminToken)).toBe(3);
      expect(await counted(workerToken)).toBe(4);
    });

    it('also resolves "me" in a quick filter, with the viewer of that request', async () => {
      const mine = condition('owner', 'CONTAINS', '@me');

      expect(await titlesOf({ quickFilter: mine }, adminToken)).toEqual(['monday', 'next sunday', 'sunday']);
      expect(await titlesOf({ quickFilter: mine }, workerToken)).toEqual([
        'just before midnight',
        'next monday',
        'saturday',
        'sunday',
      ]);
    });

    it('puts a quick filter on top of the view, not in place of it', async () => {
      const found = await titlesOf(
        { quickFilter: condition('due', 'IS_ON_OR_AFTER', '2026-10-25'), timeZone: 'UTC', viewId: viewId('Mine') },
        workerToken,
      );

      expect(found).toEqual(['just before midnight', 'next monday', 'sunday']);
    });
  });

  describe('parity with the shared engine', () => {
    const filters: [string, PageFilter][] = [
      ['a date is today', condition('due', 'IS', '@today')],
      ['a date is this week', condition('due', 'IS', '@this_week')],
      ['a date is last week', condition('due', 'IS', '@last_week')],
      ['a date is next week', condition('due', 'IS', '@next_week')],
      ['a date is before this month', condition('due', 'IS_BEFORE', '@this_month')],
      ['a date is after this week', condition('due', 'IS_AFTER', '@this_week')],
      ['a date is on or before this week', condition('due', 'IS_ON_OR_BEFORE', '@this_week')],
      ['a date is on or after this week', condition('due', 'IS_ON_OR_AFTER', '@this_week')],
      ['a date is in the past 3 days', condition('due', 'IS', '@past_days:3')],
      ['a date is in the next 5 days', condition('due', 'IS', '@next_days:5')],
      ['a date is a day', condition('due', 'IS', '2026-10-25')],
      ['a date is an instant', condition('due', 'IS', '2026-10-26T03:00:00Z')],
      ['a date is before an instant', condition('due', 'IS_BEFORE', '2026-10-26T03:00:00Z')],
      ['a date is after a day', condition('due', 'IS_AFTER', '2026-10-25')],
      ['a date is on or before a day', condition('due', 'IS_ON_OR_BEFORE', '2026-10-25')],
      ['a creation time is today', condition('createdAt', 'IS', '@today')],
      ['a creation time is before today', condition('createdAt', 'IS_BEFORE', '@today')],
      ['a creation time is on or after yesterday', condition('createdAt', 'IS_ON_OR_AFTER', '@yesterday')],
      ['a creation time is this week', condition('createdAt', 'IS', '@this_week')],
      ['a creation time is an absolute day', condition('createdAt', 'IS', '2026-10-25')],
      ['people contain me', condition('owner', 'CONTAINS', '@me')],
      ['people do not contain me', condition('owner', 'NOT_CONTAINS', '@me')],
      ['an author is me', condition('author', 'IS', '@me')],
      ['an author is not me', condition('author', 'IS_NOT', '@me')],
      [
        'this week and mine',
        {
          conditions: [condition('due', 'IS', '@this_week'), condition('owner', 'CONTAINS', '@me')],
          kind: 'GROUP',
          operator: 'AND',
        },
      ],
    ];
    const zones = ['UTC', SANTIAGO, KIRITIMATI, 'Pacific/Pago_Pago'];
    const cases = zones.flatMap((zone) =>
      filters.map(([name, filter]) => [`${name} in ${zone}`, zone, filter] as const),
    );

    it.each(cases)('agrees row for row when %s', async (_name, zone, filter) => {
      const asWorker = await titlesOf({ quickFilter: filter, timeZone: zone }, workerToken);
      const asAdmin = await titlesOf({ quickFilter: filter, timeZone: zone }, adminToken);

      expect(asWorker).toEqual(await oracleTitles(filter, zone, workerId));
      expect(asAdmin).toEqual(await oracleTitles(filter, zone, adminId));
    });
  });

  describe('a window of days, which is what a timeline and a calendar ask for', () => {
    const windowOf = (start: string, end: string): PageFilter => condition('due', 'IS', { end, start });

    it('brings the rows whose dates overlap the window, ranges that start before it included', async () => {
      const titles = await titlesOf({ quickFilter: windowOf('2026-10-24', '2026-10-25'), timeZone: 'UTC' });

      expect(titles).toEqual(['a long night', 'a trip', 'saturday', 'sunday']);
    });

    it('leaves out the rows that lie wholly outside it, and the rows with no date', async () => {
      const titles = await titlesOf({ quickFilter: windowOf('2026-11-02', '2026-11-30'), timeZone: 'UTC' });

      expect(titles).toEqual([]);
    });

    it('says the same as the shared engine, in two zones', async () => {
      const filter = windowOf('2026-10-25', '2026-10-26');

      expect(await titlesOf({ quickFilter: filter, timeZone: SANTIAGO })).toEqual(
        await oracleTitles(filter, SANTIAGO, adminId),
      );
      expect(await titlesOf({ quickFilter: filter, timeZone: KIRITIMATI })).toEqual(
        await oracleTitles(filter, KIRITIMATI, adminId),
      );
    });

    it('refuses a window that is not made of a start and an end', async () => {
      const response = await query({
        quickFilter: condition('due', 'IS', { from: '2026-10-24' }),
        reducers: [{ id: 'rows', kind: 'results' }],
      });

      expect(response.status).toBe(400);
    });
  });

  describe('markers that mean nothing', () => {
    it('refuses a date marker that is not one, with a code', async () => {
      const response = await query({
        quickFilter: condition('due', 'IS', '@someday'),
        reducers: [{ id: 'rows', kind: 'results' }],
      });

      expect(response.status).toBe(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('VIEW_QUERY_INVALID');
    });

    it('refuses a zone that does not exist', async () => {
      const response = await query({ reducers: [{ id: 'rows', kind: 'results' }], timeZone: 'Mars/Olympus' });

      expect(response.status).toBe(400);
    });

    it('refuses to save a view whose filter carries one', async () => {
      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
        .set(as(adminToken))
        .send({
          properties: PROPERTIES,
          views: [
            {
              configuration: { filter: condition('owner', 'CONTAINS', '@you') },
              isDefault: true,
              name: 'Broken',
              type: DatabaseViewType.TABLE,
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });
});
