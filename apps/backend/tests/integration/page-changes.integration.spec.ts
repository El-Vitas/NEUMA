import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import { Client } from 'pg';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface ChangesResponse {
  cursor: string;
  hasMore: boolean;
  isReset: boolean;
  rows: { id: string; title: string; version: number }[];
  total: number;
  trashedIds: string[];
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

describe('Changes of a collection since a cursor (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let spaceId: string;
  let collectionId: string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const changes = async (cursor: string | undefined, token = adminToken, limit?: number): Promise<ChangesResponse> =>
    (
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/changes`)
        .set(as(token))
        .send({ ...(cursor === undefined ? {} : { cursor }), ...(limit === undefined ? {} : { limit }) })
        .expect(HTTP_OK)
    ).body as ChangesResponse;

  const createRow = async (title: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        parentId: collectionId,
        title,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const rename = async (rowId: string, title: string): Promise<void> => {
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${rowId}/title`)
      .set(as(adminToken))
      .send({ title })
      .expect(HTTP_OK);
  };

  const withDatabase = async (work: (client: Client) => Promise<void>): Promise<void> => {
    const client = new Client({ connectionString: testApp.get(ConfigService).getOrThrow<string>('DATABASE_URL') });
    await client.connect();
    try {
      await work(client);
    } finally {
      await client.end();
    }
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `changes-admin-${stamp}@test.com`;
    const workerEmail = `changes-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Changes Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Changes Worker', password: PASSWORD });
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
      .send({ name: 'Changes', slug: `changes-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    await prisma.models.WorkspaceMember.createAndCount([{ role: 'WORKER', userId: worker.user.id, workspaceId }], {
      onConflict: 'skip',
    });
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        title: 'Work',
      })
      .expect(201);
    collectionId = (page.body as { id: string }).id;
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set(as(adminToken))
      .send({ properties: [TITLE], views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }] })
      .expect(201);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('starts from now: the first answer carries a cursor and no rows', async () => {
    await createRow('before');

    const first = await changes(undefined);

    expect(first.rows).toEqual([]);
    expect(first.cursor).not.toBe('');
    expect(first.total).toBeGreaterThanOrEqual(1);
  });

  it('reports a row that changed once, with its current state, and then nothing', async () => {
    const start = await changes(undefined);
    const rowId = await createRow('first title');
    await rename(rowId, 'second title');

    const read = await changes(start.cursor);
    const again = await changes(read.cursor);

    expect(read.rows.map((row) => row.title)).toEqual(['second title']);
    expect(read.rows[0]?.id).toBe(rowId);
    expect(again.rows).toEqual([]);
  });

  it('names the rows that went to the trash', async () => {
    const rowId = await createRow('to trash');
    const start = await changes(undefined);

    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${rowId}/trash`)
      .set(as(adminToken))
      .set('x-mutation-id', crypto.randomUUID())
      .expect(HTTP_CREATED);
    const read = await changes(start.cursor);

    expect(read.trashedIds).toEqual([rowId]);
    expect(read.rows).toEqual([]);
  });

  it('does not miss a transaction that committed after the cursor was handed out', async () => {
    const rowId = await createRow('late');
    await withDatabase(async (client) => {
      await client.query('BEGIN');
      await client.query(`UPDATE "Block" SET "text" = 'written late' WHERE "id" = $1`, [rowId]);
      const start = await changes(undefined);
      await rename(await createRow('committed in between'), 'committed in between 2');

      await client.query('COMMIT');
      const read = await changes(start.cursor);

      expect(read.rows.map((row) => row.id)).toContain(rowId);
    });
  });

  it('cuts the answer at the limit and goes on from the cursor it hands back', async () => {
    const start = await changes(undefined);
    const created = [await createRow('p1'), await createRow('p2'), await createRow('p3')];

    const first = await changes(start.cursor, adminToken, 2);
    const second = await changes(first.cursor, adminToken, 2);

    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(false);
    expect([...first.rows, ...second.rows].map((row) => row.id).sort()).toEqual([...created].sort());
  });

  it('never names a row the reader cannot open, and counts only what they can', async () => {
    const hidden = await createRow('secret');
    const start = await changes(undefined, workerToken);
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
      .expect(HTTP_OK);
    await rename(hidden, 'secret renamed');

    const read = await changes(start.cursor, workerToken);
    const adminRead = await changes(start.cursor, adminToken);

    expect(JSON.stringify(read)).not.toContain(hidden);
    expect(adminRead.rows.map((row) => row.id)).toContain(hidden);
    expect(adminRead.total).toBe(read.total + 1);
  });

  it('asks the reader to start again when the cursor is not one the server wrote', async () => {
    const read = await changes('garbage');

    expect(read.isReset).toBe(true);
    expect(read.rows).toEqual([]);
  });

  it('hands the cursor to start watching together with a query', async () => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`)
      .set(as(adminToken))
      .send({ reducers: [{ id: 'rows', kind: 'results', limit: 5 }] })
      .expect(HTTP_OK);
    const cursor = (response.body as { changesCursor: string }).changesCursor;
    const rowId = await createRow('after the query');

    const read = await changes(cursor);

    expect(read.rows.map((row) => row.id)).toContain(rowId);
  });
});
