import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE, type BlockRichText, type DiscussionView } from '@neuma/shared';
import request from 'supertest';
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

const PASSWORD = 'plainPassword123';
const HTTP_CREATED = 201;
const SILENCE_MS = 400;

const text = (value: string): BlockRichText => [{ insert: value }];

const mentioning = (person: Person): BlockRichText => [
  { insert: 'Mira ' },
  { insert: { person: { label: 'Persona', userId: person.id } } },
];

describe('Comments over the live channel (Integration)', () => {
  let testApp: LiveTestApp;
  let prisma: PrismaService;
  let admin: Person;
  let worker: Person;
  let otherWorker: Person;
  let spaceId: string;
  let pageId: string;
  let openBlockId: string;
  let secretBlockId: string;
  const openedClients: LiveClient[] = [];

  const createUser = async (label: string, role: 'ADMIN' | 'WORKER'): Promise<Person> => {
    const email = `comments-live-${label}-${crypto.randomUUID()}@test.com`;
    await createAccount(testApp, { email, name: `Live ${label}`, password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = await prisma.models.User.where({ email }).first();
    if (user === null) throw new Error(`The ${label} was not created`);
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

  const subscribe = async (client: LiveClient): Promise<void> => {
    client.send({ pageId, type: 'subscribe' });
    await client.waitFor((message) => message.type === 'subscribed' && message.pageId === pageId);
  };

  const openDiscussion = async (person: Person, blockId: string, body: BlockRichText): Promise<DiscussionView> =>
    (
      await request(testApp.getServer())
        .post(`/api/v1/blocks/${blockId}/discussions`)
        .set('Authorization', `Bearer ${person.token}`)
        .send({ body })
        .expect(HTTP_CREATED)
    ).body as DiscussionView;

  const isNotification = (message: LiveMessage): boolean => message.type === 'notification';

  const isDiscussionOf = (discussionId: string) => (message: LiveMessage) =>
    message.type === 'discussion' && message.discussionId === discussionId;

  beforeAll(async () => {
    testApp = await bootstrapLiveTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createUser('admin', 'ADMIN');
    worker = await createUser('worker', 'WORKER');
    otherWorker = await createUser('other-worker', 'WORKER');
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'comments-live',
        slug: `comments-live-${crypto.randomUUID()}`,
        visibility: SpaceVisibility.PUBLIC_INTERNAL,
      })
      .expect(HTTP_CREATED);
    spaceId = (space.body as { id: string }).id;
    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: admin.id, editedById: admin.id, spaceId };
    pageId = (await blocks.create({ ...author, type: 'page' })).id;
    openBlockId = (await blocks.create({ ...author, parentId: pageId })).id;
    secretBlockId = (
      await blocks.create({
        ...author,
        parentId: pageId,
        permissions: [{ principal: { kind: 'user' as const, userId: admin.id }, role: BLOCK_ROLE.full }],
      })
    ).id;
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

  it('tells a mentioned person on their open socket, naming only the notification', async () => {
    const client = await openClient(otherWorker);

    await openDiscussion(worker, openBlockId, mentioning(otherWorker));

    const message = await client.waitFor(isNotification);
    expect(Object.keys(message).sort()).toEqual(['notificationId', 'type']);
  });

  it('tells every open socket of the mentioned person and nobody else', async () => {
    const first = await openClient(otherWorker);
    const second = await openClient(otherWorker);
    const bystander = await openClient(worker);

    await openDiscussion(admin, openBlockId, mentioning(otherWorker));

    await first.waitFor(isNotification);
    await second.waitFor(isNotification);
    await bystander.expectSilence(isNotification, SILENCE_MS);
  });

  it('tells the subscribers of the page that a discussion changed, with the ids and nothing of the text', async () => {
    const watcher = await openClient(otherWorker);
    await subscribe(watcher);

    const discussion = await openDiscussion(worker, openBlockId, text('Contenido privado del comentario'));

    const message = await watcher.waitFor(isDiscussionOf(discussion.id));
    expect(message).toEqual({ blockId: openBlockId, discussionId: discussion.id, pageId, type: 'discussion' });
  });

  it('says nothing about a discussion on a block the subscriber cannot read', async () => {
    const watcher = await openClient(otherWorker);
    await subscribe(watcher);
    const adminWatcher = await openClient(admin);
    await subscribe(adminWatcher);

    const discussion = await openDiscussion(admin, secretBlockId, text('Secreto'));

    await adminWatcher.waitFor(isDiscussionOf(discussion.id));
    await watcher.expectSilence((message) => message.type === 'discussion', SILENCE_MS);
  });

  it('does not tell a person who cannot read the block that they were mentioned', async () => {
    const client = await openClient(otherWorker);

    await openDiscussion(admin, secretBlockId, mentioning(otherWorker));

    await client.expectSilence(isNotification, SILENCE_MS);
  });
});
