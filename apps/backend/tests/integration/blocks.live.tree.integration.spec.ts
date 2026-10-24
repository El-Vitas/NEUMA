import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { onlyUserPermissions } from '../helpers/block-access.helper';
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
const HTTP_OK = 200;
const SILENCE_MS = 400;

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const documentSaying = (text: string): PageContent => ({
  content: [{ attrs: { id: crypto.randomUUID() }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const isTreeChangeAt = (spaceId: string, parentId: string | null) => (message: LiveMessage) =>
  message.type === 'tree-changed' &&
  message.spaceId === spaceId &&
  Array.isArray(message.parentIds) &&
  message.parentIds.includes(parentId);

const isAnyTreeMessage = (message: LiveMessage) => message.type === 'tree-changed' || message.type === 'tree-resync';

describe('Live channel: changes to the page tree (Integration)', () => {
  let testApp: LiveTestApp;
  let prisma: PrismaService;
  let admin: Person;
  let worker: Person;
  let spaceId: string;
  const openedClients: LiveClient[] = [];

  const createUser = async (label: string, role: 'ADMIN' | 'WORKER'): Promise<Person> => {
    const email = `tree-live-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Tree ${label}`, password: PASSWORD });
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

  const followTree = async (client: LiveClient, space: string): Promise<void> => {
    client.send({ spaceId: space, type: 'subscribe-tree' });
    await client.waitFor((message) => message.type === 'subscribed-tree' && message.spaceId === space);
  };

  const createPage = async (title: string, parentId?: string, space = spaceId): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${space}/pages`)
      .set({ Authorization: `Bearer ${admin.token}`, 'x-mutation-id': crypto.randomUUID() })
      .send({ content: documentSaying(title), parentId, title })
      .expect(HTTP_CREATED);
    return (response.body as { id: string }).id;
  };

  const rename = async (id: string, title: string, space = spaceId): Promise<void> => {
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${space}/pages/${id}/title`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title })
      .expect(HTTP_OK);
  };

  const move = async (id: string, parentId: string): Promise<void> => {
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${id}/move`)
      .set({ Authorization: `Bearer ${admin.token}`, 'x-mutation-id': crypto.randomUUID() })
      .send({ parentId })
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
      .send({ name: 'tree-live', slug: `tree-live-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(HTTP_CREATED);
    spaceId = (space.body as { id: string }).id;
  });

  afterEach(() => {
    for (const client of openedClients.splice(0)) client.close();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('tells a follower which parent changed when a page at the top is renamed', async () => {
    const follower = await openClient(worker);
    await followTree(follower, spaceId);
    const page = await createPage('Arriba');

    await rename(page, 'Arriba renombrada');

    await follower.waitFor(isTreeChangeAt(spaceId, null));
  });

  it('names the old and the new parent when a page moves', async () => {
    const origin = await createPage('Origen');
    const destination = await createPage('Destino');
    const moving = await createPage('Viajera', origin);
    const follower = await openClient(worker);
    await followTree(follower, spaceId);

    await move(moving, destination);

    await follower.waitFor(isTreeChangeAt(spaceId, origin));
    await follower.waitFor(isTreeChangeAt(spaceId, destination));
  });

  it('names the top of the space when a page leaves it for another page', async () => {
    const destination = await createPage('Recibe');
    const leaving = await createPage('Deja la raiz');
    const follower = await openClient(worker);
    await followTree(follower, spaceId);

    await move(leaving, destination);

    await follower.waitFor(isTreeChangeAt(spaceId, null));
    await follower.waitFor(isTreeChangeAt(spaceId, destination));
  });

  it('tells the followers of the space a page arrives in, not only the ones of the space it left', async () => {
    const other = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'tree-dest', slug: `tree-dest-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(HTTP_CREATED);
    const otherSpaceId = (other.body as { id: string }).id;
    const travelling = await createPage('Viaja de espacio');
    const leavingFollower = await openClient(worker);
    await followTree(leavingFollower, spaceId);
    const arrivingFollower = await openClient(worker);
    await followTree(arrivingFollower, otherSpaceId);

    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${travelling}/move`)
      .set({ Authorization: `Bearer ${admin.token}`, 'x-mutation-id': crypto.randomUUID() })
      .send({ targetSpaceId: otherSpaceId })
      .expect(HTTP_OK);

    await leavingFollower.waitFor(isTreeChangeAt(spaceId, null));
    await arrivingFollower.waitFor(isTreeChangeAt(otherSpaceId, null));
  });

  it('does not name a parent the follower cannot read', async () => {
    const closed = await createPage('Cerrada');
    const inside = await createPage('Dentro', closed);
    await prisma.models.Block.where({ id: closed }).update({ permissions: onlyUserPermissions(admin.id) });
    await prisma.models.Block.where({ id: inside }).update({ permissions: onlyUserPermissions(admin.id) });
    const follower = await openClient(worker);
    await followTree(follower, spaceId);

    await rename(inside, 'Dentro renombrada');

    await follower.expectSilence(
      (message) => message.type === 'tree-changed' && JSON.stringify(message).includes(closed),
      SILENCE_MS,
    );
  });

  const closeToEveryoneButAdmin = async (id: string, space = spaceId): Promise<void> => {
    await request(testApp.getServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        transactions: [
          {
            id: crypto.randomUUID(),
            operations: [
              {
                args: { permissions: onlyUserPermissions(admin.id) },
                command: 'setPermission',
                path: [],
                pointer: { id, table: 'block' },
              },
            ],
            spaceId: space,
          },
        ],
      })
      .expect(HTTP_OK);
  };

  describe('what happened between the render and the first subscription', () => {
    const readWatermark = async (): Promise<string> => {
      const response = await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages/tree`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(HTTP_OK);
      return (response.body as { watermark: string }).watermark;
    };

    const followSince = async (client: LiveClient, since: string): Promise<void> => {
      client.send({ since, spaceId, type: 'subscribe-tree' });
      await client.waitFor((message) => message.type === 'subscribed-tree' && message.spaceId === spaceId);
    };

    it('reads again when a page changed after the render the client holds', async () => {
      const since = await readWatermark();
      await createPage('Creada entre el dibujo y la suscripcion');
      const follower = await openClient(worker);

      await followSince(follower, since);

      await follower.waitFor((message) => message.type === 'tree-resync' && message.spaceId === spaceId);
    });

    it('says nothing when nothing changed after the render', async () => {
      await createPage('Anterior al dibujo');
      const since = await readWatermark();
      const follower = await openClient(worker);

      await followSince(follower, since);

      await follower.expectSilence(isAnyTreeMessage, SILENCE_MS);
    });
  });

  describe('when someone loses access', () => {
    it('tells the follower the top of the space changed when a page there is closed to them', async () => {
      const page = await createPage('Se cierra arriba');
      const follower = await openClient(worker);
      await followTree(follower, spaceId);

      await closeToEveryoneButAdmin(page);

      await follower.waitFor(isTreeChangeAt(spaceId, null));
    });

    it('tells the follower which parent changed when a page under it is closed to them', async () => {
      const parent = await createPage('Madre abierta');
      const child = await createPage('Hija que se cierra', parent);
      const follower = await openClient(worker);
      await followTree(follower, spaceId);

      await closeToEveryoneButAdmin(child);

      await follower.waitFor(isTreeChangeAt(spaceId, parent));
    });

    it('tells a follower of a restricted space to read again when it is no longer a member, and then stops', async () => {
      const privateSpace = (
        await request(testApp.getServer())
          .post('/api/v1/spaces')
          .set('Authorization', `Bearer ${admin.token}`)
          .send({
            name: 'tree-restricted',
            slug: `tree-restricted-${String(Date.now())}`,
            visibility: SpaceVisibility.RESTRICTED,
          })
          .expect(HTTP_CREATED)
      ).body as { id: string };
      await prisma.models.SpaceMember.createAndCount([{ spaceId: privateSpace.id, userId: worker.id }]);
      const page = await createPage('Dentro del espacio', undefined, privateSpace.id);
      const follower = await openClient(worker);
      await followTree(follower, privateSpace.id);
      await prisma.models.SpaceMember.where({ spaceId: privateSpace.id, userId: worker.id }).delete();

      await rename(page, 'Dentro del espacio renombrada', privateSpace.id);
      await follower.waitFor((message) => message.type === 'tree-resync' && message.spaceId === privateSpace.id);
      const heardBefore = follower.messages.length;
      await rename(page, 'Dentro del espacio otra vez', privateSpace.id);
      await follower.expectSilence(() => false, SILENCE_MS);

      expect(follower.messages.slice(heardBefore).filter(isAnyTreeMessage)).toEqual([]);
    });
  });

  it('says nothing to someone who did not follow the tree', async () => {
    const listener = await openClient(worker);
    const page = await createPage('Sin seguir');

    await rename(page, 'Sin seguir renombrada');

    await listener.expectSilence(isAnyTreeMessage, SILENCE_MS);
  });

  it('stops after unfollowing', async () => {
    const follower = await openClient(worker);
    await followTree(follower, spaceId);
    follower.send({ spaceId, type: 'unsubscribe-tree' });
    const page = await createPage('Dejada de seguir');

    await rename(page, 'Dejada de seguir renombrada');

    await follower.expectSilence(isAnyTreeMessage, SILENCE_MS);
  });

  it('refuses to follow the tree of a space the person cannot read', async () => {
    const spaces = (
      await request(testApp.getServer()).get('/api/v1/spaces').set('Authorization', `Bearer ${admin.token}`)
    ).body as { id: string; ownerId: string | null; visibility: string }[];
    const privateSpace = required(
      spaces.find((space) => space.visibility === 'PRIVATE' && space.ownerId === admin.id),
      'the private space of the admin',
    );
    const intruder = await openClient(worker);

    intruder.send({ spaceId: privateSpace.id, type: 'subscribe-tree' });

    const refusal = await intruder.waitFor(
      (message) => message.type === 'error' && message.spaceId === privateSpace.id,
    );
    expect(refusal.code).toBe('access-denied');
  });
});
