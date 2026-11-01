import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import { Client } from 'pg';
import request from 'supertest';
import {
  BLOCK_LIVE_APPLICATION_NAME,
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_TOKEN_AUDIENCE,
  BLOCK_LIVE_TOKEN_PURPOSE,
} from '@/modules/blocks/constants/block.live.constants';
import { BLOCK_NOTIFY_CHANNEL } from '@/modules/blocks/constants/block.transaction.constants';
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

interface Outcome {
  blocks?: { id: string; version: number }[];
  error?: { code: string; message: string };
}

interface TransactionsResponse {
  transactions: Outcome[];
}

interface SyncedBlock {
  format: Record<string, unknown> | null;
  id: string;
  version: number;
}

interface SyncResponse {
  blocks: SyncedBlock[];
  revoked?: string[];
}

interface TokenResponse {
  token: string;
}

interface Operation {
  args: unknown;
  command: string;
  path: string[];
  pointer: { id: string; table: 'block' };
}

interface Person {
  id: string;
  token: string;
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const PRESENCE_TIME_TO_LIVE_MS = 400;
const PRESENCE_SWEEP_INTERVAL_MS = 50;
const RECONNECT_DELAY_MS = 50;
const RECONNECT_WAIT_MS = 6000;
const SILENCE_MS = 300;
const EXPIRED_TOKEN_LIFETIME = '-10s';

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

const isVersionsOf = (pageId: string, blockId: string, version: number) => (message: LiveMessage) =>
  message.type === 'versions' &&
  message.pageId === pageId &&
  Array.isArray(message.blocks) &&
  message.blocks.some(
    (block: { id?: unknown; version?: unknown }) => block.id === blockId && block.version === version,
  );

const isMessage = (type: string, pageId: string) => (message: LiveMessage) =>
  message.type === type && message.pageId === pageId;

const listBlockIds = (message: LiveMessage): unknown[] =>
  Array.isArray(message.blocks) ? message.blocks.map((block: { id?: unknown }) => block.id) : [];

describe('GET /blocks/live: live block channel (Integration)', () => {
  let testApp: LiveTestApp;
  let prisma: PrismaService;
  let admin: Person;
  let worker: Person;
  let demoted: Person;
  let leaving: Person;
  let spaceId: string;
  let restrictedSpaceId: string;
  const shrinkPageId = crypto.randomUUID();
  const shrinkChildId = crypto.randomUUID();
  const restrictedPageId = crypto.randomUUID();
  const restrictedChildId = crypto.randomUUID();
  const livePageId = crypto.randomUUID();
  const paragraphId = crypto.randomUUID();
  const secretId = crypto.randomUUID();
  const hiddenPageId = crypto.randomUUID();
  const revocablePageId = crypto.randomUUID();
  const revocableChildId = crypto.randomUUID();
  const openedClients: LiveClient[] = [];

  const createUser = async (label: string, role: 'ADMIN' | 'WORKER'): Promise<Person> => {
    const email = `blocks-live-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Live ${label}`, password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = required(await prisma.models.User.where({ email }).first(), `the ${label}`);
    return { id: user.id, token };
  };

  const mintLiveToken = async (person: Person): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/blocks/live/token')
      .set('Authorization', `Bearer ${person.token}`)
      .expect(HTTP_CREATED);
    return (response.body as TokenResponse).token;
  };

  const openClient = async (person: Person): Promise<LiveClient> => {
    const client = await connectLiveClient(testApp.port);
    openedClients.push(client);
    client.send({ token: await mintLiveToken(person), type: 'auth' });
    await client.waitFor((message) => message.type === 'ready');
    return client;
  };

  const subscribe = async (client: LiveClient, pageId: string): Promise<void> => {
    client.send({ pageId, type: 'subscribe' });
    await client.waitFor(isMessage('subscribed', pageId));
  };

  const transact = async (person: Person, operations: Operation[], inSpaceId = spaceId): Promise<Outcome> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${person.token}`)
      .send({ transactions: [{ id: crypto.randomUUID(), operations, spaceId: inSpaceId }] })
      .expect(HTTP_OK);
    return required((response.body as TransactionsResponse).transactions[0], 'an outcome');
  };

  const versionOf = (outcome: Outcome, blockId: string): number =>
    required(
      outcome.blocks?.find((block) => block.id === blockId),
      `the version of ${blockId} in ${JSON.stringify(outcome)}`,
    ).version;

  const sync = async (person: Person, body: object): Promise<SyncResponse> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${person.token}`)
      .send(body)
      .expect(HTTP_OK);
    return response.body as SyncResponse;
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
    testApp = await bootstrapLiveTestApp({
      presenceSweepIntervalMs: PRESENCE_SWEEP_INTERVAL_MS,
      presenceTimeToLiveMs: PRESENCE_TIME_TO_LIVE_MS,
      reconnectInitialDelayMs: RECONNECT_DELAY_MS,
    });
    prisma = testApp.get(PrismaService);
    admin = await createUser('admin', 'ADMIN');
    worker = await createUser('worker', 'WORKER');
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'live-open', slug: `live-open-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(HTTP_CREATED);
    spaceId = (space.body as IdResponse).id;

    const adminOnly = [{ principal: { kind: 'user' as const, userId: admin.id }, role: BLOCK_ROLE.full }];
    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: admin.id, editedById: admin.id, spaceId };
    await blocks.create({ ...author, children: [paragraphId, secretId], id: livePageId, type: 'page' });
    await blocks.create({ ...author, id: paragraphId, parentId: livePageId });
    await blocks.create({ ...author, id: secretId, parentId: livePageId, permissions: adminOnly });
    await blocks.create({ ...author, id: hiddenPageId, permissions: adminOnly, type: 'page' });
    await blocks.create({ ...author, children: [revocableChildId], id: revocablePageId, type: 'page' });
    await blocks.create({ ...author, id: revocableChildId, parentId: revocablePageId });
    await blocks.create({ ...author, children: [shrinkChildId], id: shrinkPageId, type: 'page' });
    await blocks.create({ ...author, id: shrinkChildId, parentId: shrinkPageId });

    demoted = await createUser('demoted', 'ADMIN');
    leaving = await createUser('leaving', 'ADMIN');
    const restricted = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'live-restricted',
        slug: `live-restricted-${String(Date.now())}`,
        visibility: SpaceVisibility.RESTRICTED,
      })
      .expect(HTTP_CREATED);
    restrictedSpaceId = (restricted.body as IdResponse).id;
    const restrictedAuthor = { createdById: admin.id, editedById: admin.id, spaceId: restrictedSpaceId };
    await blocks.create({ ...restrictedAuthor, children: [restrictedChildId], id: restrictedPageId, type: 'page' });
    await blocks.create({ ...restrictedAuthor, id: restrictedChildId, parentId: restrictedPageId });
  });

  const closeOpenedClients = async (): Promise<void> => {
    const clients = openedClients.splice(0);
    clients.forEach((client) => {
      client.close();
    });
    await Promise.all(clients.map((client) => client.closed));
  };

  afterEach(closeOpenedClients);

  afterAll(async () => {
    await closeOpenedClients();
    await testApp.close();
  });

  describe('connecting', () => {
    it('answers 401 to a token request without a session', async () => {
      await request(testApp.getServer()).post('/api/v1/blocks/live/token').expect(HTTP_UNAUTHORIZED);
    });

    it('closes a socket that presents a token it did not mint', async () => {
      const client = await connectLiveClient(testApp.port);

      client.send({ token: 'forged.token.value', type: 'auth' });

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket that presents an access token instead of a live token', async () => {
      const client = await connectLiveClient(testApp.port);

      client.send({ token: worker.token, type: 'auth' });

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket that presents an expired live token', async () => {
      const client = await connectLiveClient(testApp.port);
      const expired = await testApp.get(JwtService).signAsync(
        {
          aud: BLOCK_LIVE_TOKEN_AUDIENCE,
          purpose: BLOCK_LIVE_TOKEN_PURPOSE,
          role: 'WORKER',
          sub: worker.id,
          workspaceId: crypto.randomUUID(),
        },
        { expiresIn: EXPIRED_TOKEN_LIFETIME, secret: testApp.get(ConfigService).getOrThrow<string>('JWT_SECRET') },
      );

      client.send({ token: expired, type: 'auth' });

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket that subscribes before it authenticates', async () => {
      const client = await connectLiveClient(testApp.port);

      client.send({ pageId: livePageId, type: 'subscribe' });

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket that sends a message over the size limit', async () => {
      const client = await openClient(worker);

      client.send('x'.repeat(BLOCK_LIVE_MAX_MESSAGE_BYTES + 1));

      expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });
  });

  describe('subscribing', () => {
    it('refuses a page the user cannot read, without subscribing them', async () => {
      const client = await openClient(worker);

      client.send({ pageId: hiddenPageId, type: 'subscribe' });

      const refusal = await client.waitFor((message) => message.type === 'error');
      expect(refusal).toEqual({ code: 'access-denied', pageId: hiddenPageId, type: 'error' });
      expect(client.messages.some((message) => message.type === 'subscribed')).toBe(false);
    });

    it('refuses a block that is not a page', async () => {
      const client = await openClient(worker);

      client.send({ pageId: paragraphId, type: 'subscribe' });

      expect(await client.waitFor((message) => message.type === 'error')).toEqual({
        code: 'access-denied',
        pageId: paragraphId,
        type: 'error',
      });
    });
  });

  describe('versions', () => {
    it('tells a subscriber the new version after another user commits, and sync returns the change', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, livePageId);

      const outcome = await transact(admin, [op('update', paragraphId, ['format'], { textColor: 'red' })]);

      const newVersion = versionOf(outcome, paragraphId);
      await subscriber.waitFor(isVersionsOf(livePageId, paragraphId, newVersion));
      const caught = await sync(worker, { blocks: [{ id: paragraphId, version: newVersion - 1 }] });
      expect(caught.blocks.map((block) => ({ id: block.id, version: block.version }))).toEqual([
        { id: paragraphId, version: newVersion },
      ]);
      expect(caught.blocks[0]?.format).toMatchObject({ textColor: 'red' });
    });

    it('keeps telling a subscriber about a page after it moved to another space', async () => {
      const destination = await request(testApp.getServer())
        .post('/api/v1/spaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'live-dest',
          slug: `live-dest-${String(Date.now())}`,
          visibility: SpaceVisibility.PUBLIC_INTERNAL,
        })
        .expect(HTTP_CREATED);
      const destinationSpaceId = (destination.body as IdResponse).id;
      const travellingPageId = crypto.randomUUID();
      const travellingParagraphId = crypto.randomUUID();
      const blocks = createBlockFactory(prisma.models);
      const author = { createdById: admin.id, editedById: admin.id, spaceId };
      await blocks.create({ ...author, children: [travellingParagraphId], id: travellingPageId, type: 'page' });
      await blocks.create({ ...author, id: travellingParagraphId, parentId: travellingPageId });
      const subscriber = await openClient(worker);
      await subscribe(subscriber, travellingPageId);

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${spaceId}/pages/${travellingPageId}/move`)
        .set({ Authorization: `Bearer ${admin.token}`, 'x-mutation-id': crypto.randomUUID() })
        .send({ targetSpaceId: destinationSpaceId })
        .expect(HTTP_OK);
      const outcome = await transact(
        admin,
        [op('update', travellingParagraphId, ['format'], { textColor: 'green' })],
        destinationSpaceId,
      );

      await subscriber.waitFor(
        isVersionsOf(travellingPageId, travellingParagraphId, versionOf(outcome, travellingParagraphId)),
      );
    });

    it('does not send an id the subscriber cannot read, and sends it to the one who can', async () => {
      const subscriber = await openClient(worker);
      const owner = await openClient(admin);
      await subscribe(subscriber, livePageId);
      await subscribe(owner, livePageId);

      const outcome = await transact(admin, [
        op('update', paragraphId, ['format'], { textColor: 'orange' }),
        op('update', secretId, ['format'], { textColor: 'orange' }),
      ]);

      const paragraphVersion = versionOf(outcome, paragraphId);
      const forWorker = await subscriber.waitFor(isVersionsOf(livePageId, paragraphId, paragraphVersion));
      const forOwner = await owner.waitFor(isVersionsOf(livePageId, secretId, versionOf(outcome, secretId)));
      expect(listBlockIds(forWorker)).toEqual([paragraphId]);
      expect(listBlockIds(forOwner).toSorted()).toEqual([paragraphId, secretId].toSorted());
      expect(JSON.stringify(subscriber.messages)).not.toContain(secretId);
    });

    it('sends a resync, and no id, to a user who can read none of the touched blocks', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, livePageId);

      await transact(admin, [op('update', secretId, ['format'], { textColor: 'blue' })]);

      await subscriber.waitFor(isMessage('resync', livePageId));
      await subscriber.expectSilence((message) => message.type === 'versions', SILENCE_MS);
      expect(JSON.stringify(subscriber.messages)).not.toContain(secretId);
    });

    it('sends nothing about a page the socket is not subscribed to', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, livePageId);

      await transact(admin, [op('update', revocableChildId, ['format'], { textColor: 'green' })]);

      await subscriber.expectSilence((message) => message.type === 'versions', SILENCE_MS);
    });
  });

  describe('revoking access', () => {
    it('tells a subscriber who lost the page that it was revoked and stops sending to them', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, revocablePageId);

      await transact(admin, [
        op('setPermission', revocablePageId, [], {
          permissions: [{ principal: { kind: 'user', userId: admin.id }, role: BLOCK_ROLE.full }],
        }),
      ]);

      await subscriber.waitFor(isMessage('revoked', revocablePageId));
      await transact(admin, [op('update', revocableChildId, ['format'], { textColor: 'purple' })]);
      await subscriber.expectSilence((message) => message.type === 'versions', SILENCE_MS);
    });
  });

  describe('presence', () => {
    it('shows each subscriber where the others are, hides blocks they cannot read, and expires it', async () => {
      const viewer = await openClient(worker);
      const editor = await openClient(admin);
      await subscribe(viewer, livePageId);
      await subscribe(editor, livePageId);

      editor.send({ blockId: paragraphId, pageId: livePageId, type: 'presence' });
      const seen = await viewer.waitFor(
        (message) =>
          message.type === 'presence' &&
          Array.isArray(message.users) &&
          message.users.some((user: { blockId?: unknown }) => user.blockId === paragraphId),
      );
      expect(seen).toMatchObject({
        pageId: livePageId,
        users: [{ blockId: paragraphId, expiresAt: expect.any(Number) as number, userId: admin.id }],
      });

      editor.send({ blockId: secretId, pageId: livePageId, type: 'presence' });
      await viewer.waitFor(
        (message) =>
          message.type === 'presence' &&
          Array.isArray(message.users) &&
          message.users.some(
            (user: { blockId?: unknown; userId?: unknown }) => user.userId === admin.id && user.blockId === null,
          ),
      );
      expect(JSON.stringify(viewer.messages)).not.toContain(secretId);

      const alreadyReceived = viewer.messages.length;
      await viewer.waitFor(
        (message) =>
          viewer.messages.indexOf(message) >= alreadyReceived &&
          message.type === 'presence' &&
          Array.isArray(message.users) &&
          message.users.length === 0,
      );
    });

    it('removes the presence of a subscriber who closes the socket', async () => {
      const viewer = await openClient(worker);
      const editor = await openClient(admin);
      await subscribe(viewer, livePageId);
      await subscribe(editor, livePageId);
      editor.send({ blockId: null, pageId: livePageId, type: 'presence' });
      await viewer.waitFor(
        (message) => message.type === 'presence' && Array.isArray(message.users) && message.users.length > 0,
      );

      const alreadyReceived = viewer.messages.length;
      editor.close();

      await viewer.waitFor(
        (message) =>
          viewer.messages.indexOf(message) >= alreadyReceived &&
          message.type === 'presence' &&
          Array.isArray(message.users) &&
          message.users.length === 0,
      );
    });

    it('refuses presence on a block the sender cannot read', async () => {
      const viewer = await openClient(worker);
      await subscribe(viewer, livePageId);

      viewer.send({ blockId: secretId, pageId: livePageId, type: 'presence' });

      expect(await viewer.waitFor((message) => message.type === 'error')).toEqual({
        code: 'access-denied',
        pageId: livePageId,
        type: 'error',
      });
    });
  });

  describe('resync', () => {
    it('asks subscribers of the space to resync when a notification was truncated', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, livePageId);

      await withDatabase(async (client) => {
        await client.query('SELECT pg_notify($1, $2)', [
          BLOCK_NOTIFY_CHANNEL,
          JSON.stringify({ spaceId, transactionId: crypto.randomUUID(), truncated: true }),
        ]);
      });

      await subscriber.waitFor(isMessage('resync', livePageId));
    });

    it('asks every subscriber to resync after the listen connection dropped, and keeps announcing versions', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, livePageId);

      await withDatabase(async (client) => {
        await client.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1 AND datname = current_database()',
          [BLOCK_LIVE_APPLICATION_NAME],
        );
      });

      await subscriber.waitFor(isMessage('resync', livePageId), RECONNECT_WAIT_MS);
      const outcome = await transact(admin, [op('update', paragraphId, ['format'], { textColor: 'brown' })]);
      await subscriber.waitFor(isVersionsOf(livePageId, paragraphId, versionOf(outcome, paragraphId)));
    });
  });

  describe('a block hidden from a subscriber who holds it', () => {
    it('sends a resync without the id, and the catch-up sync lists the block as revoked', async () => {
      const subscriber = await openClient(worker);
      await subscribe(subscriber, shrinkPageId);
      const held = await sync(worker, { pageId: shrinkPageId });
      const heldVersion = required(
        held.blocks.find((block) => block.id === shrinkChildId),
        'the block the worker holds',
      ).version;

      await transact(admin, [
        op('setPermission', shrinkChildId, [], {
          permissions: [{ principal: { kind: 'user', userId: admin.id }, role: BLOCK_ROLE.full }],
        }),
      ]);

      await subscriber.waitFor(isMessage('resync', shrinkPageId));
      expect(JSON.stringify(subscriber.messages)).not.toContain(shrinkChildId);
      const caughtUp = await sync(worker, { blocks: [{ id: shrinkChildId, version: heldVersion }] });
      expect(caughtUp.revoked).toEqual([shrinkChildId]);
    });
  });

  describe('the current account of a subscriber', () => {
    it('uses the role the user has now, not the one in the token', async () => {
      const subscriber = await openClient(demoted);
      await subscribe(subscriber, restrictedPageId);

      await prisma.models.User.where({ id: demoted.id }).update({ role: 'WORKER' });
      await transact(admin, [op('update', restrictedChildId, ['format'], { textColor: 'red' })], restrictedSpaceId);

      await subscriber.waitFor(isMessage('revoked', restrictedPageId));
    });

    it('closes the sockets of a user who is no longer active', async () => {
      const subscriber = await openClient(leaving);
      await subscribe(subscriber, restrictedPageId);

      await prisma.models.User.where({ id: leaving.id }).update({ isActive: false });
      await transact(admin, [op('update', restrictedChildId, ['format'], { textColor: 'blue' })], restrictedSpaceId);

      expect((await subscriber.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });
  });
});

describe('GET /blocks/live: maximum socket age (Integration)', () => {
  const MAXIMUM_AGE_MS = 300;
  let testApp: LiveTestApp;

  beforeAll(async () => {
    testApp = await bootstrapLiveTestApp({ maxConnectionAgeMs: MAXIMUM_AGE_MS });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('closes the socket with the code that tells the client to reconnect with a fresh token', async () => {
    const email = `blocks-live-age-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Live Age', password: PASSWORD });
    const accessToken = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const minted = await request(testApp.getServer())
      .post('/api/v1/blocks/live/token')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HTTP_CREATED);
    const client = await connectLiveClient(testApp.port);
    client.send({ token: (minted.body as TokenResponse).token, type: 'auth' });
    await client.waitFor((message) => message.type === 'ready');

    expect((await client.closed).code).toBe(BLOCK_LIVE_CLOSE_CODE.reconnectRequired);
  });
});
