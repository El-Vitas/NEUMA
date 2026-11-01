import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import request from 'supertest';
import { Doc, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { BLOCK_WRITE_RATE_LIMIT } from '@/common/constants/throttler.constants';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES,
} from '@/modules/blocks/constants/block.live.constants';
import { BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH } from '@/modules/blocks/constants/block.transaction.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import {
  bootstrapLiveTestApp,
  connectLiveClient,
  type LiveClient,
  type LiveMessage,
  type LiveTestApp,
} from '../helpers/block-live.helper';

interface IdResponse {
  id: string;
}

interface TokenResponse {
  token: string;
}

interface Person {
  id: string;
  token: string;
}

interface Operation {
  args: unknown;
  command: string;
  path: string[];
  pointer: { id: string; table: 'block' };
}

interface Outcome {
  blocks?: { id: string; version: number }[];
  error?: { code: string; message: string };
  id: string;
}

interface TransactionsBody {
  transactions: Outcome[];
}

interface SyncedBlock {
  id: string;
  properties: Record<string, unknown> | null;
  role: string;
  version: number;
}

interface SyncBody {
  blocks: SyncedBlock[];
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const LARGE_TEXT_CHARACTERS = 19_000;
const SILENCE_MS = 150;

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const op = (command: string, id: string, path: string[], args: unknown): Operation => ({
  args,
  command,
  path,
  pointer: { id, table: 'block' },
});

const isResultOf =
  (type: string, requestId: string) =>
  (message: LiveMessage): boolean =>
    message.type === type && message.requestId === requestId;

const isErrorOf =
  (requestId: string) =>
  (message: LiveMessage): boolean =>
    message.type === 'error' && message.requestId === requestId;

const outcomesOf = (message: LiveMessage): Outcome[] => (message.transactions as Outcome[] | undefined) ?? [];

const buildTextUpdate = (text: string): string => {
  const doc = new Doc();
  const before = encodeStateVector(doc);
  doc.getText('title').insert(0, text);
  return Buffer.from(encodeStateAsUpdate(doc, before)).toString('base64');
};

describe('live socket requests: transactions and sync (Integration)', () => {
  let testApp: LiveTestApp;
  let prisma: PrismaService;
  let admin: Person;
  let worker: Person;
  let spaceId: string;
  const pageId = crypto.randomUUID();
  const openedClients: LiveClient[] = [];

  const createUser = async (label: string, role: 'ADMIN' | 'WORKER'): Promise<Person> => {
    const email = `blocks-live-requests-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Requests ${label}`, password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = required(await prisma.models.User.where({ email }).first(), `the ${label}`);
    return { id: user.id, token };
  };

  const openClient = async (person: Person): Promise<LiveClient> => {
    const client = await connectLiveClient(testApp.port);
    openedClients.push(client);
    const minted = await request(testApp.getServer())
      .post('/api/v1/blocks/live/token')
      .set('Authorization', `Bearer ${person.token}`)
      .expect(HTTP_CREATED);
    client.send({ token: (minted.body as TokenResponse).token, type: 'auth' });
    await client.waitFor((message) => message.type === 'ready');
    return client;
  };

  const createParagraphOps = (blockId: string, title = 'Hello'): Operation[] => [
    op('set', blockId, [], {
      id: blockId,
      parentId: pageId,
      properties: { title: [{ insert: title }] },
      type: 'paragraph',
    }),
    op('listAfter', pageId, ['children'], { id: blockId }),
  ];

  const transactionOf = (operations: Operation[], id = crypto.randomUUID()) => ({ id, operations, spaceId });

  const syncOverHttp = async (person: Person, body: object): Promise<SyncBody> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${person.token}`)
      .send(body)
      .expect(HTTP_OK);
    return response.body as SyncBody;
  };

  const closeOpenedClients = async (): Promise<void> => {
    const clients = openedClients.splice(0);
    clients.forEach((client) => {
      client.close();
    });
    await Promise.all(clients.map((client) => client.closed));
  };

  beforeAll(async () => {
    testApp = await bootstrapLiveTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createUser('admin', 'ADMIN');
    worker = await createUser('worker', 'WORKER');
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'live-requests',
        slug: `live-requests-${String(Date.now())}`,
        visibility: SpaceVisibility.PUBLIC_INTERNAL,
      })
      .expect(HTTP_CREATED);
    spaceId = (space.body as IdResponse).id;
    await createBlockFactory(prisma.models).create({
      children: [],
      createdById: admin.id,
      editedById: admin.id,
      id: pageId,
      spaceId,
      type: 'page',
    });
  });

  afterEach(closeOpenedClients);

  afterAll(async () => {
    await closeOpenedClients();
    await testApp.close();
  });

  describe('transactions', () => {
    it('applies a transaction and makes it readable over a sync message', async () => {
      const client = await openClient(worker);
      const blockId = crypto.randomUUID();
      const transactionId = crypto.randomUUID();

      client.send({
        requestId: 'write-1',
        transactions: [transactionOf(createParagraphOps(blockId, 'From the socket'), transactionId)],
        type: 'transactions',
      });
      const result = await client.waitFor(isResultOf('transactionsResult', 'write-1'));
      client.send({ blocks: [{ id: blockId, version: 0 }], requestId: 'read-1', type: 'sync' });
      const synced = await client.waitFor(isResultOf('syncResult', 'read-1'));

      expect(outcomesOf(result).map((outcome) => outcome.id)).toEqual([transactionId]);
      expect(outcomesOf(result)[0]?.error).toBeUndefined();
      const block = (synced.blocks as SyncedBlock[]).find((candidate) => candidate.id === blockId);
      expect(block?.properties).toEqual({ title: [{ insert: 'From the socket' }] });
    });

    it('answers the same outcomes the HTTP endpoint gives for the same transaction', async () => {
      const client = await openClient(worker);
      const blockId = crypto.randomUUID();
      const operations = createParagraphOps(blockId);
      const transactionId = crypto.randomUUID();

      const overHttp = await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${worker.token}`)
        .send({ transactions: [transactionOf(operations, transactionId)] })
        .expect(HTTP_OK);
      client.send({
        requestId: 'replay-1',
        transactions: [transactionOf(operations, transactionId)],
        type: 'transactions',
      });
      const overSocket = await client.waitFor(isResultOf('transactionsResult', 'replay-1'));

      expect(outcomesOf(overSocket)).toEqual((overHttp.body as TransactionsBody).transactions);
    });

    it('answers a failed transaction as an outcome with its error, like the endpoint does', async () => {
      const client = await openClient(worker);

      client.send({
        requestId: 'bad-1',
        transactions: [transactionOf([op('update', crypto.randomUUID(), [], { alive: false })])],
        type: 'transactions',
      });

      const result = await client.waitFor(isResultOf('transactionsResult', 'bad-1'));
      expect(outcomesOf(result)[0]?.error).toBeDefined();
    });

    it('sends the answer only to the socket that asked, while the versions reach every subscriber', async () => {
      const writer = await openClient(worker);
      const watcher = await openClient(admin);
      watcher.send({ pageId, type: 'subscribe' });
      await watcher.waitFor((message) => message.type === 'subscribed');
      const blockId = crypto.randomUUID();

      writer.send({
        requestId: 'only-1',
        transactions: [transactionOf(createParagraphOps(blockId))],
        type: 'transactions',
      });
      await writer.waitFor(isResultOf('transactionsResult', 'only-1'));
      await watcher.waitFor((message) => message.type === 'versions');

      expect(watcher.messages.some((message) => message.requestId === 'only-1')).toBe(false);
    });

    it('applies two transactions sent back to back on one socket in the order they were sent', async () => {
      const client = await openClient(worker);
      const blockId = crypto.randomUUID();

      client.send({
        requestId: 'order-1',
        transactions: [transactionOf(createParagraphOps(blockId, 'first'))],
        type: 'transactions',
      });
      client.send({
        requestId: 'order-2',
        transactions: [transactionOf([op('update', blockId, ['properties'], { title: [{ insert: 'second' }] })])],
        type: 'transactions',
      });
      const second = await client.waitFor(isResultOf('transactionsResult', 'order-2'));
      client.send({ blocks: [{ id: blockId, version: 0 }], requestId: 'order-read', type: 'sync' });
      const synced = await client.waitFor(isResultOf('syncResult', 'order-read'));

      expect(outcomesOf(second)[0]?.error).toBeUndefined();
      const requestIds = client.messages
        .filter((message) => message.type === 'transactionsResult')
        .map((message) => message.requestId);
      expect(requestIds).toEqual(['order-1', 'order-2']);
      const block = (synced.blocks as SyncedBlock[]).find((candidate) => candidate.id === blockId);
      expect(block?.properties).toEqual({ title: [{ insert: 'second' }] });
    });

    it('rejects the transaction of a user who was demoted to CLIENT after the socket opened', async () => {
      const demoted = await createUser('demoted', 'ADMIN');
      const client = await openClient(demoted);
      await prisma.models.User.where({ id: demoted.id }).update({ role: 'CLIENT' });
      const blockId = crypto.randomUUID();

      client.send({
        requestId: 'demoted-1',
        transactions: [transactionOf(createParagraphOps(blockId))],
        type: 'transactions',
      });

      const result = await client.waitFor(isResultOf('transactionsResult', 'demoted-1'));
      expect(outcomesOf(result)[0]?.error).toBeDefined();
      expect(await prisma.models.Block.where({ id: blockId }).first()).toBeNull();
    });

    it('closes with 4401 the socket of a user whose account was deactivated', async () => {
      const leaving = await createUser('leaving', 'WORKER');
      const client = await openClient(leaving);
      await prisma.models.User.where({ id: leaving.id }).update({ isActive: false });

      client.send({
        requestId: 'gone-1',
        transactions: [transactionOf(createParagraphOps(crypto.randomUUID()))],
        type: 'transactions',
      });

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('answers rate-limited, without closing the socket, to a user who already used the HTTP allowance', async () => {
      const busy = await createUser('busy', 'WORKER');
      const client = await openClient(busy);
      const blockId = crypto.randomUUID();
      const attempt = () =>
        request(testApp.getServer())
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${busy.token}`)
          .send({ transactions: [transactionOf([op('update', crypto.randomUUID(), [], { alive: false })])] });
      await Promise.all(Array.from({ length: BLOCK_WRITE_RATE_LIMIT.burstLimit + 10 }, attempt));

      client.send({
        requestId: 'limited-1',
        transactions: [transactionOf(createParagraphOps(blockId))],
        type: 'transactions',
      });

      const refusal = await client.waitFor(isErrorOf('limited-1'));
      expect(refusal.code).toBe('rate-limited');
      await client.expectSilence((message) => message.type === 'transactionsResult', SILENCE_MS);
      expect(await prisma.models.Block.where({ id: blockId }).first()).toBeNull();
    });

    it('lets a large applyText through and closes with 1009 a message over the request limit', async () => {
      const client = await openClient(worker);
      const blockId = crypto.randomUUID();
      client.send({
        requestId: 'seed-1',
        transactions: [transactionOf(createParagraphOps(blockId))],
        type: 'transactions',
      });
      await client.waitFor(isResultOf('transactionsResult', 'seed-1'));
      const update = buildTextUpdate('a'.repeat(LARGE_TEXT_CHARACTERS));
      expect(update.length).toBeGreaterThan(BLOCK_LIVE_MAX_MESSAGE_BYTES);
      expect(update.length).toBeLessThanOrEqual(BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH);

      client.send({
        requestId: 'large-1',
        transactions: [transactionOf([op('applyText', blockId, [], { property: 'title', update })])],
        type: 'transactions',
      });
      const result = await client.waitFor(isResultOf('transactionsResult', 'large-1'));
      client.send('x'.repeat(BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES + 1));

      expect(outcomesOf(result)[0]?.error).toBeUndefined();
      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });

    it('closes with 1009 a large message that is not a request', async () => {
      const client = await openClient(worker);

      client.send(JSON.stringify({ filler: 'x'.repeat(BLOCK_LIVE_MAX_MESSAGE_BYTES), type: 'ping' }));

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });
  });

  describe('sync', () => {
    it('answers a page read with what the HTTP endpoint answers', async () => {
      const client = await openClient(worker);

      client.send({ pageId, requestId: 'page-1', type: 'sync' });
      const overSocket = await client.waitFor(isResultOf('syncResult', 'page-1'));
      const overHttp = await syncOverHttp(worker, { pageId });

      expect(overSocket.blocks).toEqual(overHttp.blocks);
    });

    it('answers a failed read with an error that carries the request id and the HTTP error code', async () => {
      const client = await openClient(worker);

      client.send({ pageId: crypto.randomUUID(), requestId: 'missing-1', type: 'sync' });

      const refusal = await client.waitFor(isErrorOf('missing-1'));
      expect(refusal.code).toBe('BLOCK_ACCESS_DENIED');
    });

    it('answers invalid-message, and keeps the socket open, to a sync that names both a page and blocks', async () => {
      const client = await openClient(worker);

      client.send({ blocks: [{ id: pageId, version: 0 }], pageId, requestId: 'both-1', type: 'sync' });

      const refusal = await client.waitFor((message) => message.type === 'error');
      expect(refusal.code).toBe('invalid-message');
    });

    it('reads with the role the account has now', async () => {
      const demoted = await createUser('sync-demoted', 'ADMIN');
      const client = await openClient(demoted);
      await prisma.models.User.where({ id: demoted.id }).update({ role: 'CLIENT' });

      client.send({ pageId, requestId: 'demoted-read', type: 'sync' });

      const synced = await client.waitFor(isResultOf('syncResult', 'demoted-read'));
      const page = (synced.blocks as SyncedBlock[]).find((candidate) => candidate.id === pageId);
      expect(page?.role).toBe(BLOCK_ROLE.reader);
    });
  });
});
