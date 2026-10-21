import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import request from 'supertest';
import { BlockLiveRepository } from '@/modules/blocks/infrastructure/persistence/block.live.repository';
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

interface Person {
  id: string;
  token: string;
}

interface IdResponse {
  id: string;
}

const PASSWORD = 'plainPassword123';
const HTTP_CREATED = 201;
const HTTP_OK = 200;
const SILENCE_MS = 400;

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const isChangesOf = (collectionId: string, rowId: string) => (message: LiveMessage) =>
  message.type === 'collection-changes' &&
  message.collectionId === collectionId &&
  Array.isArray(message.rows) &&
  message.rows.some((row: { id?: unknown }) => row.id === rowId);

const isOfType = (type: string, collectionId: string) => (message: LiveMessage) =>
  message.type === type && message.collectionId === collectionId;

describe('Live channel: change notices per collection (Integration)', () => {
  let testApp: LiveTestApp;
  let prisma: PrismaService;
  let admin: Person;
  let worker: Person;
  let spaceId: string;
  const collectionId = crypto.randomUUID();
  const otherCollectionId = crypto.randomUUID();
  const rowId = crypto.randomUUID();
  const otherRowId = crypto.randomUUID();
  const hiddenRowId = crypto.randomUUID();
  const openedClients: LiveClient[] = [];

  const createUser = async (label: string, role: 'ADMIN' | 'WORKER'): Promise<Person> => {
    const email = `collection-live-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Live ${label}`, password: PASSWORD });
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
    client.send({ token: (minted.body as { token: string }).token, type: 'auth' });
    await client.waitFor((message) => message.type === 'ready');
    return client;
  };

  const follow = async (client: LiveClient, id: string): Promise<void> => {
    client.send({ collectionId: id, type: 'subscribe-collection' });
    await client.waitFor(isOfType('subscribed-collection', id));
  };

  const rename = async (person: Person, id: string, title: string): Promise<void> => {
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${id}/title`)
      .set('Authorization', `Bearer ${person.token}`)
      .send({ title })
      .expect(HTTP_OK);
  };

  const hideRowFrom = async (id: string): Promise<void> => {
    await request(testApp.getServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        transactions: [
          {
            id: crypto.randomUUID(),
            operations: [
              {
                args: { permissions: [{ principal: { kind: 'user', userId: admin.id }, role: BLOCK_ROLE.full }] },
                command: 'setPermission',
                path: [],
                pointer: { id, table: 'block' },
              },
            ],
            spaceId,
          },
        ],
      })
      .expect(HTTP_OK);
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
        name: 'collection-live',
        slug: `collection-live-${String(Date.now())}`,
        visibility: SpaceVisibility.PUBLIC_INTERNAL,
      })
      .expect(HTTP_CREATED);
    spaceId = (space.body as IdResponse).id;
    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: admin.id, editedById: admin.id, spaceId };
    await blocks.create({ ...author, children: [rowId, hiddenRowId], id: collectionId, type: 'page' });
    await blocks.create({ ...author, id: rowId, parentId: collectionId, type: 'page' });
    await blocks.create({ ...author, id: hiddenRowId, parentId: collectionId, type: 'page' });
    await blocks.create({ ...author, children: [otherRowId], id: otherCollectionId, type: 'page' });
    await blocks.create({ ...author, id: otherRowId, parentId: otherCollectionId, type: 'page' });
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

  it('tells a follower of the collection which row changed and at what version, and nobody else', async () => {
    const follower = await openClient(worker);
    const bystander = await openClient(worker);
    await follow(follower, collectionId);
    await follow(bystander, otherCollectionId);

    await rename(admin, rowId, 'renamed');

    const notice = await follower.waitFor(isChangesOf(collectionId, rowId));
    expect(JSON.stringify(notice.rows)).toContain(rowId);
    expect(Array.isArray(notice.rows) ? notice.rows : []).toHaveLength(1);
    await bystander.expectSilence((message) => message.type === 'collection-changes', SILENCE_MS);
  });

  it('refuses to follow a collection the person cannot read', async () => {
    const closed = crypto.randomUUID();
    await createBlockFactory(prisma.models).create({
      createdById: admin.id,
      editedById: admin.id,
      id: closed,
      permissions: [{ principal: { kind: 'user', userId: admin.id }, role: BLOCK_ROLE.full }],
      spaceId,
      type: 'page',
    });
    const client = await openClient(worker);

    client.send({ collectionId: closed, type: 'subscribe-collection' });

    const refusal = await client.waitFor((message) => message.type === 'error' && message.collectionId === closed);
    expect(refusal.code).toBe('access-denied');
  });

  it('never names a row the follower cannot read, and tells them to query again when its access changed', async () => {
    const follower = await openClient(worker);
    await follow(follower, collectionId);

    await hideRowFrom(hiddenRowId);

    await follower.waitFor(isOfType('collection-resync', collectionId));
    expect(JSON.stringify(follower.messages)).not.toContain(hiddenRowId);

    await rename(admin, hiddenRowId, 'renamed in secret');
    await follower.expectSilence((message) => JSON.stringify(message).includes(hiddenRowId), SILENCE_MS);
  });

  it('reads the chains once per notification however many people follow, so a burst costs one read per commit', async () => {
    const burst = Array.from({ length: 20 }, () => crypto.randomUUID());
    const blocks = createBlockFactory(prisma.models);
    for (const id of burst) {
      await blocks.create({
        createdById: admin.id,
        editedById: admin.id,
        id,
        parentId: collectionId,
        spaceId,
        type: 'page',
      });
    }
    const followers = await Promise.all([openClient(worker), openClient(worker), openClient(admin)]);
    for (const follower of followers) await follow(follower, collectionId);
    const repository = testApp.get(BlockLiveRepository);
    let reads = 0;
    const original = repository.readChains.bind(repository);
    repository.readChains = (seedIds) => {
      reads += 1;
      return original(seedIds);
    };

    await Promise.all(burst.map((id) => rename(admin, id, `burst ${id}`)));
    await Promise.all(
      followers.map((follower) =>
        follower.waitFor(
          (message) =>
            message.type === 'collection-changes' &&
            Array.isArray(message.rows) &&
            message.rows.some((row: { id?: unknown }) => row.id === burst.at(-1)),
        ),
      ),
    );

    repository.readChains = original;
    expect(reads).toBeLessThanOrEqual(burst.length);
  });

  it('stops notifying after the person unfollows', async () => {
    const follower = await openClient(worker);
    await follow(follower, collectionId);
    follower.send({ collectionId, type: 'unsubscribe-collection' });

    await rename(admin, rowId, 'renamed again');

    await follower.expectSilence((message) => message.type === 'collection-changes', SILENCE_MS);
  });
});
