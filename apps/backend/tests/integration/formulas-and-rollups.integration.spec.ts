import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import type { PageContent, PageFormulaCellError, PagePropertyValue, PageQueryOutcome } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface RowResponse {
  computedErrors?: Record<string, PageFormulaCellError>;
  id: string;
  propertyValues: Record<string, PagePropertyValue> | null;
  title: string;
}

interface QueryResponse {
  reducers: Record<string, PageQueryOutcome | undefined>;
  rows: Record<string, RowResponse | undefined>;
}

interface SchemaResponse {
  properties: {
    computed?: { formula: { resultType: string } | null; rollup: { resultType: string } | null };
    key: string;
  }[];
}

interface ApiError {
  error: { code: string; details?: { code?: string; message?: string; dependents?: unknown } };
}

const PASSWORD = 'plainPassword123';

const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

describe('Formulas and rollups (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let spaceId: string;
  let linesId: string;
  let ordersId: string;
  const rowIds = new Map<string, string>();

  const rowId = (name: string): string => {
    const id = rowIds.get(name);
    if (id === undefined) throw new Error(`No row ${name}`);
    return id;
  };

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createPage = async (title: string, parentId: string | undefined, propertyValues?: Record<string, unknown>) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({ content: plainContent(title), parentId, propertyValues, title });

  const createRow = async (title: string, parentId: string, propertyValues: Record<string, unknown>) => {
    const response = await createPage(title, parentId, propertyValues);
    expect(response.status).toBe(201);
    return (response.body as { id: string }).id;
  };

  const define = (pageId: string, properties: unknown[], token = adminToken) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
      .set(as(token))
      .send({ properties, views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }] });

  const transact = (token: string, operations: unknown[]) =>
    request(testApp.getServer())
      .post('/api/v1/transactions')
      .set(as(token))
      .send({ transactions: [{ id: crypto.randomUUID(), operations, spaceId }] })
      .expect(200);

  const relate = (rowId: string, targetId: string) =>
    transact(adminToken, [
      {
        args: { property: 'lines', targetId },
        command: 'addRelation',
        path: [],
        pointer: { id: rowId, table: 'block' },
      },
    ]);

  const query = (body: Record<string, unknown>, token = adminToken, collection = ordersId) =>
    request(testApp.getServer()).post(`/api/v1/spaces/${spaceId}/pages/${collection}/query`).set(as(token)).send(body);

  const ask = async (body: Record<string, unknown>, token = adminToken): Promise<QueryResponse> =>
    (await query(body, token).expect(200)).body as QueryResponse;

  const idsOf = (response: QueryResponse, reducer = 'rows'): readonly string[] => {
    const outcome = response.reducers[reducer];
    if (outcome?.kind !== 'results') throw new Error('not results');
    return outcome.ids;
  };

  const titlesOf = (response: QueryResponse, reducer = 'rows'): string[] =>
    idsOf(response, reducer).map((id) => response.rows[id]?.title ?? '?');

  const allRows = { reducers: [{ id: 'rows', kind: 'results', limit: 100 }] };

  const cellValue = (response: QueryResponse, rowKey: string, property: string): PagePropertyValue | undefined =>
    response.rows[rowId(rowKey)]?.propertyValues?.[property];

  const hasGreaterThan = (propertyKey: string, value: number) => ({
    conditions: [{ kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey, value }],
    kind: 'GROUP',
    operator: 'AND',
  });

  const priceProperty = { key: 'price', label: 'Price', options: null, required: false, type: 'NUMBER' };
  const quantityProperty = { key: 'quantity', label: 'Quantity', options: null, required: false, type: 'NUMBER' };

  const computedProperties = (): unknown[] => [
    TITLE,
    priceProperty,
    quantityProperty,
    {
      config: { targetCollectionId: linesId },
      key: 'lines',
      label: 'Lines',
      options: null,
      required: false,
      type: 'RELATION',
    },
    {
      formula: 'prop("Price") * prop("Quantity")',
      key: 'total',
      label: 'Total',
      options: null,
      required: false,
      type: 'FORMULA',
    },
    {
      formula: 'prop("Price") / prop("Quantity")',
      key: 'unit',
      label: 'Unit',
      options: null,
      required: false,
      type: 'FORMULA',
    },
    {
      key: 'sum',
      label: 'Lines total',
      options: null,
      required: false,
      rollup: { calculation: 'SUM', relationPropertyKey: 'lines', targetPropertyKey: 'amount' },
      type: 'ROLLUP',
    },
    {
      key: 'count',
      label: 'Line count',
      options: null,
      required: false,
      rollup: { calculation: 'COUNT_ALL', relationPropertyKey: 'lines', targetPropertyKey: 'title' },
      type: 'ROLLUP',
    },
  ];

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `formula-admin-${stamp}@test.com`;
    const workerEmail = `formula-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Formula Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Formula Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: workerEmail }).update({ role: 'WORKER' });
    const admin = await loginUser(testApp, adminEmail, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    const worker = await loginUser(testApp, workerEmail, PASSWORD);
    workerToken = worker.accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as(adminToken))
      .send({ name: 'Formulas', slug: `formulas-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    await prisma.models.WorkspaceMember.createAndCount([{ role: 'WORKER', userId: worker.user.id, workspaceId }], {
      onConflict: 'skip',
    });
    linesId = ((await createPage('Lines', undefined)).body as { id: string }).id;
    await define(linesId, [
      TITLE,
      { key: 'amount', label: 'Amount', options: null, required: false, type: 'NUMBER' },
    ]).expect(201);
    rowIds.set('l1', await createRow('L1', linesId, { amount: 100 }));
    rowIds.set('l2', await createRow('L2', linesId, { amount: 250 }));
    rowIds.set('l3', await createRow('L3', linesId, { amount: 50 }));
    ordersId = ((await createPage('Orders', undefined)).body as { id: string }).id;
    await define(ordersId, [TITLE, priceProperty, quantityProperty, { ...(computedProperties()[3] as object) }]).expect(
      201,
    );
    rowIds.set('o1', await createRow('O1', ordersId, { price: 10, quantity: 3 }));
    rowIds.set('o2', await createRow('O2', ordersId, { price: 5, quantity: 4 }));
    rowIds.set('o3', await createRow('O3', ordersId, { price: 8, quantity: 0 }));
    await relate(rowId('o1'), rowId('l1'));
    await relate(rowId('o1'), rowId('l2'));
    await relate(rowId('o2'), rowId('l3'));
    const defined = await define(ordersId, computedProperties());
    expect({ body: defined.body as unknown, status: defined.status }).toMatchObject({ status: 201 });
    await transact(adminToken, [
      {
        args: { permissions: [{ principal: { kind: 'user', userId: adminId }, role: 'full' }] },
        command: 'setPermission',
        path: [],
        pointer: { id: rowId('l3'), table: 'block' },
      },
    ]);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('defining them', () => {
    it('answers with the type each one produces', async () => {
      const schema = (
        await request(testApp.getServer())
          .get(`/api/v1/spaces/${spaceId}/pages/${ordersId}/schema`)
          .set(as(adminToken))
          .expect(200)
      ).body as SchemaResponse;

      const byKey = new Map(schema.properties.map((property) => [property.key, property.computed]));
      expect(byKey.get('total')?.formula?.resultType).toBe('NUMBER');
      expect(byKey.get('sum')?.rollup?.resultType).toBe('NUMBER');
      expect(byKey.get('count')?.rollup?.resultType).toBe('NUMBER');
    });

    it('refuses a formula that does not parse, with a code, a message and where', async () => {
      const response = await define(ordersId, [
        ...computedProperties().slice(0, 4),
        { formula: 'prop("Price") +', key: 'broken', label: 'Broken', options: null, required: false, type: 'FORMULA' },
      ]);

      expect(response.status).toBe(400);
      const details = (response.body as ApiError).error.details;
      expect(details?.code).toBe('FORMULA_SYNTAX');
    });

    it('refuses to remove a property that a formula reads', async () => {
      const response = await define(
        ordersId,
        computedProperties().filter((property) => (property as { key: string }).key !== 'quantity'),
      );

      expect(response.status).toBe(400);
      expect((response.body as ApiError).error.details?.code).toBe('PROPERTY_IN_USE');
    });

    it('refuses to remove a property that a rollup of another collection reads', async () => {
      const response = await define(linesId, [TITLE]);

      expect(response.status).toBe(400);
      expect((response.body as ApiError).error.details?.code).toBe('PROPERTY_IN_USE');
    });

    it('refuses a write to a computed property', async () => {
      const response = await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('o1')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { total: 5 } });

      expect(response.status).toBe(400);
    });
  });

  describe('reading them', () => {
    it('gives each row the value of its formulas and rollups', async () => {
      const response = await ask(allRows);

      expect(cellValue(response, 'o1', 'total')).toBe(30);
      expect(cellValue(response, 'o1', 'sum')).toBe(350);
      expect(cellValue(response, 'o1', 'count')).toBe(2);
      expect(cellValue(response, 'o2', 'total')).toBe(20);
    });

    it('keeps an error in its cell, with a code, and leaves the rest of the row intact', async () => {
      const response = await ask(allRows);

      const row = response.rows[rowId('o3')];
      expect(row?.computedErrors?.unit?.code).toBe('FORMULA_DIVISION_BY_ZERO');
      expect(row?.propertyValues?.unit).toBeUndefined();
      expect(row?.propertyValues?.total).toBe(0);
    });

    it('says which other collections its rollups read, so a client can listen to them', async () => {
      const response = (await query(allRows).expect(200)).body as { computedDependsOn: string[] };

      expect(response.computedDependsOn).toEqual([linesId]);
    });

    it('does not count, add or show a row the reader cannot open', async () => {
      const asAdmin = await ask(allRows);
      const asWorker = await ask(allRows, workerToken);

      expect(cellValue(asAdmin, 'o2', 'sum')).toBe(50);
      expect(cellValue(asAdmin, 'o2', 'count')).toBe(1);
      expect(cellValue(asWorker, 'o2', 'sum')).toBe(0);
      expect(cellValue(asWorker, 'o2', 'count')).toBe(0);
    });

    it('gives a row read on its own page the values of its formulas and rollups, and its errors', async () => {
      const read = async (name: string, token = adminToken): Promise<RowResponse> =>
        (
          await request(testApp.getServer())
            .get(`/api/v1/spaces/${spaceId}/pages/${rowId(name)}`)
            .set(as(token))
            .expect(200)
        ).body as RowResponse;

      const first = await read('o1');
      const third = await read('o3');
      const asWorker = await read('o2', workerToken);

      expect(first.propertyValues?.total).toBe(30);
      expect(first.propertyValues?.sum).toBe(350);
      expect(third.computedErrors?.unit?.code).toBe('FORMULA_DIVISION_BY_ZERO');
      expect(asWorker.propertyValues?.sum).toBe(0);
    });

    it('follows a change of a related row at once', async () => {
      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l1')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 1000 } })
        .expect(200);

      expect(cellValue(await ask(allRows), 'o1', 'sum')).toBe(1250);

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l1')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 100 } })
        .expect(200);

      expect(cellValue(await ask(allRows), 'o1', 'sum')).toBe(350);
    });
  });

  describe('following a collection with rollups', () => {
    interface ChangesResponse {
      cursor: string;
      possiblyChanged: RowResponse[];
      possiblyChangedIsTruncated: boolean;
      rows: RowResponse[];
    }

    const readChanges = async (cursor?: string, token = adminToken): Promise<ChangesResponse> =>
      (
        await request(testApp.getServer())
          .post(`/api/v1/spaces/${spaceId}/pages/${ordersId}/changes`)
          .set(as(token))
          .send({ cursor })
          .expect(200)
      ).body as ChangesResponse;

    it('names the rows whose rollup may have changed because a row they summarise changed', async () => {
      const start = await readChanges();
      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l2')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 251 } })
        .expect(200);

      const changes = await readChanges(start.cursor);

      expect(changes.rows).toHaveLength(0);
      expect(changes.possiblyChanged.map((row) => row.title)).toEqual(['O1']);
      expect(changes.possiblyChanged[0]?.propertyValues?.sum).toBe(351);
      expect(changes.possiblyChangedIsTruncated).toBe(false);

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l2')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 250 } })
        .expect(200);
    });

    it('does not name a row for a related row the reader cannot open', async () => {
      const start = await readChanges(undefined, workerToken);
      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l3')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 51 } })
        .expect(200);

      const changes = await readChanges(start.cursor, workerToken);

      expect(changes.possiblyChanged).toHaveLength(0);

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('l3')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { amount: 50 } })
        .expect(200);
    });

    it('gives the rows that changed their computed values too', async () => {
      const start = await readChanges();
      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('o1')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { price: 11 } })
        .expect(200);

      const changes = await readChanges(start.cursor);

      expect(changes.rows.map((row) => row.title)).toEqual(['O1']);
      expect(changes.rows[0]?.propertyValues?.total).toBe(33);

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${rowId('o1')}/properties`)
        .set(as(adminToken))
        .send({ propertyValues: { price: 10 } })
        .expect(200);
    });
  });

  describe('filtering, sorting, grouping and totalling by them', () => {
    it('filters by a formula', async () => {
      const response = await ask({ ...allRows, quickFilter: hasGreaterThan('total', 25) });

      expect(titlesOf(response)).toEqual(['O1']);
    });

    it('filters by a rollup', async () => {
      const response = await ask({ ...allRows, quickFilter: hasGreaterThan('sum', 100) });

      expect(titlesOf(response)).toEqual(['O1']);
    });

    it('sorts by a formula in both directions, with the rows that have an error last', async () => {
      const ascending = await ask({ ...allRows, sorts: [{ direction: 'ASCENDING', propertyKey: 'unit' }] });
      const descending = await ask({ ...allRows, sorts: [{ direction: 'DESCENDING', propertyKey: 'unit' }] });

      expect(titlesOf(ascending)).toEqual(['O2', 'O1', 'O3']);
      expect(titlesOf(descending)).toEqual(['O1', 'O2', 'O3']);
    });

    it('pages through a sort by a computed value with a cursor that does not repeat or skip', async () => {
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let guard = 0; guard < 10; guard += 1) {
        const response = await ask({
          reducers: [{ cursor, id: 'rows', kind: 'results', limit: 1 }],
          sorts: [{ direction: 'DESCENDING', propertyKey: 'total' }],
        });
        seen.push(...titlesOf(response));
        const outcome = response.reducers.rows;
        cursor = outcome?.kind === 'results' ? (outcome.nextCursor ?? undefined) : undefined;
        if (cursor === undefined) break;
      }

      expect(seen).toEqual(['O1', 'O2', 'O3']);
    });

    it('groups by a formula', async () => {
      const response = await ask({ reducers: [{ groupBy: 'total', id: 'groups', kind: 'groups' }] });

      const outcome = response.reducers.groups;
      if (outcome?.kind !== 'groups') throw new Error('not groups');
      const filled = outcome.groups.filter((group) => group.ids.length > 0).map((group) => group.key);
      expect(filled.sort()).toEqual(['0', '20', '30']);
    });

    it('totals a formula and a rollup over the rows that pass the filter', async () => {
      const response = await ask({
        reducers: [
          {
            by: 'NONE',
            id: 'totals',
            items: [
              { calculation: 'SUM', id: 'sumOfTotals', propertyKey: 'total' },
              { calculation: 'SUM', id: 'sumOfLines', propertyKey: 'sum' },
              { calculation: 'MAXIMUM', id: 'mostLines', propertyKey: 'count' },
            ],
            kind: 'aggregations',
          },
        ],
      });

      const totals = response.reducers.totals;
      if (totals?.kind !== 'aggregations') throw new Error('not aggregations');
      expect(totals.totals).toMatchObject({ mostLines: 2, sumOfLines: 400, sumOfTotals: 50 });
    });

    it('says how many cells of a totalled column failed, so a total is not read as the whole truth', async () => {
      const response = await ask({
        reducers: [
          {
            by: 'NONE',
            id: 'totals',
            items: [
              { calculation: 'SUM', id: 'sumOfUnits', propertyKey: 'unit' },
              { calculation: 'SUM', id: 'sumOfTotals', propertyKey: 'total' },
            ],
            kind: 'aggregations',
          },
        ],
      });

      const totals = response.reducers.totals;
      if (totals?.kind !== 'aggregations') throw new Error('not aggregations');
      expect(totals.errorCounts).toEqual({ sumOfUnits: 1 });
    });

    it('sees only what the reader may open when it totals a rollup', async () => {
      const response = await ask(
        {
          reducers: [
            {
              by: 'NONE',
              id: 'totals',
              items: [{ calculation: 'SUM', id: 'sumOfLines', propertyKey: 'sum' }],
              kind: 'aggregations',
            },
          ],
        },
        workerToken,
      );

      const totals = response.reducers.totals;
      if (totals?.kind !== 'aggregations') throw new Error('not aggregations');
      expect(totals.totals.sumOfLines).toBe(350);
    });

    it('does not filter by the original values of a rollup, and says so', async () => {
      await define(ordersId, [
        ...computedProperties(),
        {
          key: 'originals',
          label: 'Originals',
          options: null,
          required: false,
          rollup: { calculation: 'SHOW_ORIGINAL', relationPropertyKey: 'lines', targetPropertyKey: 'amount' },
          type: 'ROLLUP',
        },
      ]).expect(201);

      const response = await query({ ...allRows, sorts: [{ direction: 'ASCENDING', propertyKey: 'originals' }] });

      expect(response.status).toBe(400);
      expect((response.body as ApiError).error.code).toBe('VIEW_QUERY_INVALID');
    });
  });
});
