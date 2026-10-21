import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import type { PageQueryOutcome, PageQueryResponse } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaResponse {
  properties: { key: string; options?: { group?: string; id: string; value: string }[] | null }[];
  views: { configuration: Record<string, unknown>; id: string; name: string; version: number }[];
}

interface ChangedView {
  configuration: Record<string, unknown>;
  id: string;
  version: number;
}

const PASSWORD = 'plainPassword123';

const PROPERTIES = [
  { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE },
  { key: 'status', label: 'Status', options: null, required: false, type: DatabasePropertyType.STATUS },
];

describe('Changing a view by operations (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let spaceId: string;
  let collectionId: string;
  let schema: SchemaResponse;
  let boardId: string;
  let tableId: string;
  let rowIds: string[];

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const base = (): string => `/api/v1/spaces/${spaceId}/pages/${collectionId}`;

  const statusId = (group: string): string => {
    const option = schema.properties
      .find((property) => property.key === 'status')
      ?.options?.find((o) => o.group === group);
    if (option === undefined) throw new Error(`No status in ${group}`);
    return option.id;
  };

  const operate = (viewId: string, operations: unknown[], token = adminToken) =>
    request(testApp.getServer()).post(`${base()}/views/${viewId}/operations`).set(as(token)).send({ operations });

  const move = (viewId: string, body: Record<string, unknown>, token = adminToken) =>
    request(testApp.getServer()).post(`${base()}/views/${viewId}/move-row`).set(as(token)).send(body);

  const readSchema = async (): Promise<SchemaResponse> =>
    (await request(testApp.getServer()).get(`${base()}/schema`).set(as(adminToken)).expect(200)).body as SchemaResponse;

  const rowAt = (index: number): string => rowIds[index] ?? '';

  const ask = async (body: object): Promise<PageQueryResponse> =>
    (await request(testApp.getServer()).post(`${base()}/query`).set(as(adminToken)).send(body).expect(200))
      .body as PageQueryResponse;

  const idsOf = (outcome: PageQueryOutcome | undefined): readonly string[] => {
    if (outcome?.kind !== 'results') throw new Error('not results');
    return outcome.ids;
  };

  const storedOrder = async (viewId: string): Promise<readonly string[] | null> => {
    const view = await prisma.models.PageSchemaView.select('manualOrder').where({ id: viewId }).first();
    return view?.manualOrder ?? null;
  };

  const createRow = async (title: string): Promise<string> => {
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
        title,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `ops-admin-${stamp}@test.com`;
    const clientEmail = `ops-client-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Ops Admin', password: PASSWORD });
    await createAccount(testApp, { email: clientEmail, name: 'Ops Client', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    adminToken = (await loginUser(testApp, adminEmail, PASSWORD)).accessToken;
    clientToken = (await loginUser(testApp, clientEmail, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as(adminToken))
      .send({ name: 'Ops', slug: `ops-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({
        content: {
          content: [{ content: [{ text: 'Board', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Board',
      });
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`${base()}/schema`)
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
    boardId = schema.views.find((view) => view.name === 'Board')?.id ?? '';
    tableId = schema.views.find((view) => view.name === 'Table')?.id ?? '';
    rowIds = [await createRow('one'), await createRow('two'), await createRow('three'), await createRow('four')];
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('the configuration', () => {
    it('keeps the changes of two people to different keys, and counts a version for each operation', async () => {
      const before = (await readSchema()).views.find((view) => view.id === tableId)?.version ?? 0;

      const first = await operate(tableId, [
        { args: { key: 'title', value: 240 }, command: 'setEntry', path: ['configuration', 'columnWidths'] },
      ]).expect(200);
      const second = await operate(tableId, [
        { args: 2, command: 'set', path: ['configuration', 'frozenColumns'] },
        { args: { key: 'status', value: 'CENTER' }, command: 'setEntry', path: ['configuration', 'columnAlignments'] },
      ]).expect(200);

      const changed = second.body as ChangedView;
      expect(changed.configuration).toMatchObject({
        columnAlignments: { status: 'CENTER' },
        columnWidths: { title: 240 },
        frozenColumns: 2,
      });
      expect(changed.version).toBe(before + 3);
      expect((first.body as ChangedView).version).toBe(before + 1);
    });

    it('does not let a shape saved from a stale screen write an old configuration back', async () => {
      const stale = await readSchema();
      await operate(tableId, [{ args: 3, command: 'set', path: ['configuration', 'frozenColumns'] }]).expect(200);

      await request(testApp.getServer())
        .post(`${base()}/schema`)
        .set(as(adminToken))
        .send({
          properties: PROPERTIES,
          views: stale.views.map((view) => ({
            configuration: view.configuration,
            id: view.id,
            isDefault: view.name === 'Board',
            name: view.name,
            type: view.name === 'Board' ? 'BOARD' : 'TABLE',
          })),
        })
        .expect(201);

      const after = await readSchema();
      expect(after.views.find((view) => view.id === tableId)?.configuration.frozenColumns).toBe(3);
      expect(after.views.map((view) => view.id).sort()).toEqual([boardId, tableId].sort());
    });

    it('refuses an operation that leaves a board with nothing to group by, and changes nothing', async () => {
      const before = (await readSchema()).views.find((view) => view.id === boardId);

      await operate(boardId, [{ args: null, command: 'set', path: ['configuration', 'groupBy'] }]).expect(400);

      expect((await readSchema()).views.find((view) => view.id === boardId)?.version).toBe(before?.version);
    });

    it('refuses a reader who cannot edit the collection', async () => {
      const response = await operate(
        tableId,
        [{ args: 1, command: 'set', path: ['configuration', 'frozenColumns'] }],
        clientToken,
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('the order by hand', () => {
    it('follows the collection until someone orders it, then keeps its own list', async () => {
      expect(await storedOrder(boardId)).toBeNull();
      const natural = idsOf(
        (await ask({ reducers: [{ id: 'rows', kind: 'results' }], viewId: boardId })).reducers.rows,
      );
      expect(natural).toEqual(rowIds);

      await operate(boardId, [
        { args: { after: rowAt(0), id: rowAt(3) }, command: 'listAfter', path: ['manualOrder'] },
      ]).expect(200);

      expect(await storedOrder(boardId)).toEqual([rowAt(0), rowAt(3), rowAt(1), rowAt(2)]);
      const ordered = idsOf(
        (await ask({ reducers: [{ id: 'rows', kind: 'results' }], viewId: boardId })).reducers.rows,
      );
      expect(ordered).toEqual([rowAt(0), rowAt(3), rowAt(1), rowAt(2)]);
      const other = idsOf((await ask({ reducers: [{ id: 'rows', kind: 'results' }], viewId: tableId })).reducers.rows);
      expect(other).toEqual(rowIds);
    });

    it('puts a new row at the end of a list that exists, and not in the one that does not', async () => {
      const created = await createRow('five');

      expect((await storedOrder(boardId))?.at(-1)).toBe(created);
      expect(await storedOrder(tableId)).toBeNull();
      rowIds.push(created);
    });
  });

  describe('moving a card', () => {
    it('changes the value and the place in one transaction', async () => {
      const done = statusId('COMPLETE');
      const row = rowAt(1);
      const anchor = rowAt(2);

      const response = await move(boardId, { after: anchor, rowId: row, values: { status: done } }).expect(200);

      const order = await storedOrder(boardId);
      expect(order?.indexOf(row)).toBe((order?.indexOf(anchor) ?? 0) + 1);
      const stored = await prisma.models.Block.select('properties').where({ id: row }).first();
      const storedValues = (stored?.properties as { values?: Record<string, unknown> } | undefined)?.values;
      expect(storedValues?.status).toBe(done);
      expect((response.body as ChangedView).version).toBeGreaterThan(0);
    });

    it('leaves the card where it was when the value is refused', async () => {
      const row = rowAt(0);
      const orderBefore = await storedOrder(boardId);
      const valueBefore = await prisma.models.Block.select('properties').where({ id: row }).first();

      await move(boardId, { after: rowAt(2), rowId: row, values: { status: 'not-an-option' } }).expect(400);

      expect(await storedOrder(boardId)).toEqual(orderBefore ?? []);
      expect((await prisma.models.Block.select('properties').where({ id: row }).first())?.properties).toEqual(
        valueBefore?.properties ?? {},
      );
    });

    it('does not move a page that is not a row of the collection', async () => {
      await move(boardId, { after: rowAt(0), rowId: collectionId, values: {} }).expect(403);
    });

    it('reads the column in the order the card was given', async () => {
      const done = statusId('COMPLETE');

      const column = await ask({
        reducers: [{ group: { key: done }, groupBy: 'status', id: 'column', kind: 'groupResults' }],
        viewId: boardId,
      });

      expect(idsOf(column.reducers.column)).toContain(rowAt(1));
    });
  });
});
