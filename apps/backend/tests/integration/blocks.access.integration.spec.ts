import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface AccessEntry {
  principal: { kind: 'space' } | { kind: 'user'; userId: string };
  role: string;
  user: { email: string; id: string; name: string } | null;
}

interface AccessResponse {
  blockId: string;
  entries: AccessEntry[];
  inherited: { entries: AccessEntry[]; source: { id: string; title: string; type: string } | null };
  isDeclaredHere: boolean;
  members: { canReadSpace: boolean; email: string; id: string; name: string; workspaceRole: string }[];
  source: { id: string; title: string; type: string } | null;
  spaceId: string;
  viewerId: string;
}

interface SyncedBlock {
  hasOwnPermissions: boolean;
  id: string;
  permissions?: unknown;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

const PASSWORD = 'plainPassword123';
const MISSING_BLOCK_ID = '00000000-0000-7000-8000-000000000000';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

const required = <Row>(row: Row | null, description: string): Row => {
  if (row === null) throw new Error(`Expected ${description} to exist`);
  return row;
};

describe('GET /blocks/:blockId/access (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let workerToken: string;
  let clientToken: string;
  let adminId: string;
  let workerId: string;
  let clientId: string;
  let openSpaceId: string;
  let closedSpaceId: string;
  const openPageId = crypto.randomUUID();
  const plainSectionId = crypto.randomUUID();
  const restrictedSectionId = crypto.randomUUID();
  const insideRestrictedId = crypto.randomUUID();
  const workerManagedId = crypto.randomUUID();
  const clientGrantedId = crypto.randomUUID();
  const closedPageId = crypto.randomUUID();
  const trashedPageId = crypto.randomUUID();
  const hiddenFromWorkerId = crypto.randomUUID();
  const guardedPageId = crypto.randomUUID();
  const narrowedChildId = crypto.randomUUID();

  const getAccess = (token: string, blockId: string) =>
    request(testApp.getServer()).get(`/api/v1/blocks/${blockId}/access`).set('Authorization', `Bearer ${token}`);

  const createSpace = async (name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const createUser = async (label: string, role: 'ADMIN' | 'CLIENT' | 'WORKER') => {
    const email = `blocks-access-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Access ${label}`, password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = required(await prisma.models.User.where({ email }).first(), `the ${label}`);
    return { id: user.id, token };
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const admin = await createUser('admin', 'ADMIN');
    const worker = await createUser('worker', 'WORKER');
    const client = await createUser('client', 'CLIENT');
    adminToken = admin.token;
    workerToken = worker.token;
    clientToken = client.token;
    adminId = admin.id;
    workerId = worker.id;
    clientId = client.id;
    openSpaceId = await createSpace('access-open', SpaceVisibility.PUBLIC_INTERNAL);
    closedSpaceId = await createSpace('access-closed', SpaceVisibility.RESTRICTED);

    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: adminId, editedById: adminId, spaceId: openSpaceId };
    await blocks.create({
      ...author,
      children: [plainSectionId, restrictedSectionId, workerManagedId, clientGrantedId, hiddenFromWorkerId],
      id: openPageId,
      title: 'Shared page',
      type: 'page',
    });
    await blocks.create({ ...author, id: plainSectionId, parentId: openPageId });
    await blocks.create({
      ...author,
      children: [insideRestrictedId],
      id: restrictedSectionId,
      parentId: openPageId,
      permissions: [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
        { principal: { kind: 'user', userId: workerId }, role: BLOCK_ROLE.editor },
        { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
      ],
      title: 'Restricted section',
    });
    await blocks.create({ ...author, id: insideRestrictedId, parentId: restrictedSectionId });
    await blocks.create({
      ...author,
      id: workerManagedId,
      parentId: openPageId,
      permissions: [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
        { principal: { kind: 'user', userId: workerId }, role: BLOCK_ROLE.full },
      ],
    });
    await blocks.create({
      ...author,
      id: clientGrantedId,
      parentId: openPageId,
      permissions: [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
        { principal: { kind: 'user', userId: clientId }, role: BLOCK_ROLE.full },
      ],
    });
    await blocks.create({
      ...author,
      id: hiddenFromWorkerId,
      parentId: openPageId,
      permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
    });
    await blocks.create({
      ...author,
      children: [narrowedChildId],
      id: guardedPageId,
      permissions: [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
        { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
      ],
      title: 'Guarded page',
      type: 'page',
    });
    await blocks.create({
      ...author,
      id: narrowedChildId,
      parentId: guardedPageId,
      permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
    });
    await blocks.create({ ...author, id: closedPageId, spaceId: closedSpaceId, title: 'Closed', type: 'page' });
    await blocks.create({ ...author, id: trashedPageId, lifecycle: 'TRASHED', title: 'Trashed', type: 'page' });
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('who may ask', () => {
    it('requires a session', async () => {
      await request(testApp.getServer()).get(`/api/v1/blocks/${openPageId}/access`).expect(HTTP_UNAUTHORIZED);
    });

    it('does not tell a worker with edit access who else has access', async () => {
      const response = await getAccess(workerToken, openPageId).expect(HTTP_FORBIDDEN);

      expect((response.body as ErrorResponse).error.code).toBe('BLOCK_PERMISSIONS_FORBIDDEN');
      expect(JSON.stringify(response.body)).not.toContain('@test.com');
    });

    it('does not tell a client, even one listed as full on the block', async () => {
      const unlisted = await getAccess(clientToken, openPageId).expect(HTTP_FORBIDDEN);
      const listed = await getAccess(clientToken, clientGrantedId).expect(HTTP_FORBIDDEN);

      expect((unlisted.body as ErrorResponse).error.code).toBe('BLOCK_PERMISSIONS_FORBIDDEN');
      expect((listed.body as ErrorResponse).error.code).toBe('BLOCK_PERMISSIONS_FORBIDDEN');
    });

    it('answers a block the viewer cannot read like one that does not exist', async () => {
      const hidden = await getAccess(workerToken, hiddenFromWorkerId).expect(HTTP_FORBIDDEN);
      const inside = await getAccess(workerToken, closedPageId).expect(HTTP_FORBIDDEN);
      const missing = await getAccess(workerToken, MISSING_BLOCK_ID).expect(HTTP_FORBIDDEN);

      expect(hidden.body).toEqual(missing.body);
      expect(inside.body).toEqual(missing.body);
      expect((missing.body as ErrorResponse).error.code).toBe('BLOCK_ACCESS_DENIED');
    });

    it('answers a block in the trash like one that does not exist', async () => {
      const trashed = await getAccess(adminToken, trashedPageId).expect(HTTP_FORBIDDEN);

      expect((trashed.body as ErrorResponse).error.code).toBe('BLOCK_ACCESS_DENIED');
    });

    it('lets a worker who holds full on the block read it', async () => {
      const response = await getAccess(workerToken, workerManagedId).expect(HTTP_OK);

      expect((response.body as AccessResponse).isDeclaredHere).toBe(true);
    });
  });

  describe('what it says', () => {
    it('says a block with no declaration anywhere follows the space, with nobody listed', async () => {
      const response = await getAccess(adminToken, plainSectionId).expect(HTTP_OK);
      const access = response.body as AccessResponse;

      expect(access.blockId).toBe(plainSectionId);
      expect(access.viewerId).toBe(adminId);
      expect(access.spaceId).toBe(openSpaceId);
      expect(access.isDeclaredHere).toBe(false);
      expect(access.source).toBeNull();
      expect(access.entries).toEqual([]);
    });

    it('lists the people a block declares, with their names, and the space default', async () => {
      const response = await getAccess(adminToken, restrictedSectionId).expect(HTTP_OK);
      const access = response.body as AccessResponse;

      expect(access.isDeclaredHere).toBe(true);
      expect(access.source?.id).toBe(restrictedSectionId);
      expect(access.entries.map((entry) => entry.role)).toEqual([
        BLOCK_ROLE.full,
        BLOCK_ROLE.editor,
        BLOCK_ROLE.reader,
      ]);
      expect(access.entries[1]?.user?.name).toBe('Access worker');
      expect(access.entries[2]?.principal).toEqual({ kind: 'space' });
      expect(access.entries[2]?.user).toBeNull();
    });

    it('names the ancestor a block inherits from', async () => {
      const response = await getAccess(adminToken, insideRestrictedId).expect(HTTP_OK);
      const access = response.body as AccessResponse;

      expect(access.isDeclaredHere).toBe(false);
      expect(access.source).toEqual({ id: restrictedSectionId, title: 'Restricted section', type: 'paragraph' });
      expect(access.entries).toHaveLength(3);
    });

    it('says what a block would follow if it stopped declaring its own', async () => {
      const own = (await getAccess(adminToken, narrowedChildId).expect(HTTP_OK)).body as AccessResponse;
      const alone = (await getAccess(adminToken, restrictedSectionId).expect(HTTP_OK)).body as AccessResponse;
      const following = (await getAccess(adminToken, insideRestrictedId).expect(HTTP_OK)).body as AccessResponse;

      expect(own.isDeclaredHere).toBe(true);
      expect(own.entries).toHaveLength(1);
      expect(own.inherited.source?.id).toBe(guardedPageId);
      expect(own.inherited.entries.map((entry) => entry.role)).toEqual([BLOCK_ROLE.full, BLOCK_ROLE.reader]);
      expect(alone.inherited).toEqual({ entries: [], source: null });
      expect(following.inherited.source?.id).toBe(restrictedSectionId);
    });

    it('offers the active members of the workspace, saying who cannot read the space', async () => {
      const open = (await getAccess(adminToken, plainSectionId).expect(HTTP_OK)).body as AccessResponse;
      const closed = (await getAccess(adminToken, closedPageId).expect(HTTP_OK)).body as AccessResponse;

      const openIds = open.members.map((member) => member.id);
      expect(openIds).toContain(workerId);
      expect(openIds).toContain(clientId);
      expect(open.members.every((member) => member.canReadSpace)).toBe(true);
      expect(closed.members.find((member) => member.id === workerId)?.canReadSpace).toBe(false);
      expect(closed.members.find((member) => member.id === adminId)?.canReadSpace).toBe(true);
      expect(closed.members.find((member) => member.id === workerId)?.workspaceRole).toBe('WORKER');
    });
  });

  describe('restricting a block and giving it back', () => {
    const setPermissions = (token: string, blockId: string, permissions: unknown) =>
      request(testApp.getServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                { args: { permissions }, command: 'setPermission', path: [], pointer: { id: blockId, table: 'block' } },
              ],
              spaceId: openSpaceId,
            },
          ],
        })
        .expect(HTTP_OK);

    const syncedIds = async (token: string): Promise<string[]> => {
      const response = await request(testApp.getServer())
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: openPageId })
        .expect(HTTP_OK);
      return (response.body as { blocks: SyncedBlock[] }).blocks.map((block) => block.id);
    };

    it('hides the block from the one it leaves out, then shows it again once it follows its parent', async () => {
      const section = plainSectionId;
      expect(await syncedIds(workerToken)).toContain(section);

      const restricted = await setPermissions(adminToken, section, [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
      ]);
      expect((restricted.body as { transactions: { error?: unknown }[] }).transactions[0]?.error).toBeUndefined();

      expect(await syncedIds(workerToken)).not.toContain(section);
      expect(await syncedIds(adminToken)).toContain(section);
      const hidden = await getAccess(workerToken, section).expect(HTTP_FORBIDDEN);
      expect((hidden.body as ErrorResponse).error.code).toBe('BLOCK_ACCESS_DENIED');
      const declared = (await getAccess(adminToken, section).expect(HTTP_OK)).body as AccessResponse;
      expect(declared.isDeclaredHere).toBe(true);
      expect(declared.entries).toHaveLength(1);

      await setPermissions(adminToken, section, null);

      expect(await syncedIds(workerToken)).toContain(section);
      const followed = (await getAccess(adminToken, section).expect(HTTP_OK)).body as AccessResponse;
      expect(followed.isDeclaredHere).toBe(false);
    });

    it('refuses a declaration after which nobody who can open the space would hold full access', async () => {
      const section = plainSectionId;
      const failureOf = (outcome: { body: unknown }): string | undefined =>
        (outcome.body as { transactions: { error?: { code: string } }[] }).transactions[0]?.error?.code;

      const onlyAWorkerEditor = await setPermissions(adminToken, section, [
        { principal: { kind: 'user', userId: workerId }, role: BLOCK_ROLE.editor },
      ]);
      const onlyAClientFull = await setPermissions(adminToken, section, [
        { principal: { kind: 'user', userId: clientId }, role: BLOCK_ROLE.full },
      ]);
      const nobody = await setPermissions(adminToken, section, []);
      const workerFull = await setPermissions(adminToken, section, [
        { principal: { kind: 'user', userId: workerId }, role: BLOCK_ROLE.full },
      ]);

      expect(failureOf(onlyAWorkerEditor)).toBe('BLOCK_PERMISSIONS_LOCKOUT');
      expect(failureOf(onlyAClientFull)).toBe('BLOCK_PERMISSIONS_LOCKOUT');
      expect(failureOf(nobody)).toBe('BLOCK_PERMISSIONS_LOCKOUT');
      expect(failureOf(workerFull)).toBeUndefined();
      await setPermissions(workerToken, section, null);
    });

    it('refuses the worker who has no full access, whoever else is named', async () => {
      const outcome = await setPermissions(workerToken, openPageId, null);

      const failure = (outcome.body as { transactions: { error?: { code: string } }[] }).transactions[0]?.error;
      expect(failure?.code).toBe('BLOCK_PERMISSIONS_FORBIDDEN');
    });
  });

  describe('what a reader learns from a sync', () => {
    const sync = (token: string, pageId: string) =>
      request(testApp.getServer())
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId })
        .expect(HTTP_OK);

    it('flags the blocks that declare permissions without handing out who is on them', async () => {
      const response = await sync(workerToken, openPageId);
      const blocks = (response.body as { blocks: SyncedBlock[] }).blocks;
      const restricted = blocks.find((block) => block.id === restrictedSectionId);
      const plain = blocks.find((block) => block.id === plainSectionId);

      expect(restricted?.hasOwnPermissions).toBe(true);
      expect(restricted).not.toHaveProperty('permissions');
      expect(plain?.hasOwnPermissions).toBe(false);
    });

    it('flags in the page the ones that declare their own permissions', async () => {
      const declaringPageId = crypto.randomUUID();
      await createBlockFactory(prisma.models).create({
        createdById: adminId,
        editedById: adminId,
        id: declaringPageId,
        permissions: [
          { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
          { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
        ],
        spaceId: openSpaceId,
        title: 'Declaring page',
        type: 'page',
      });

      const readPage = (pageId: string) =>
        request(testApp.getServer())
          .get(`/api/v1/spaces/${openSpaceId}/pages/${pageId}`)
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(HTTP_OK);

      const declaring = (await readPage(declaringPageId)).body as { hasOwnPermissions: boolean };
      const following = (await readPage(openPageId)).body as { hasOwnPermissions: boolean };

      expect(declaring.hasOwnPermissions).toBe(true);
      expect(following.hasOwnPermissions).toBe(false);
    });

    it('does not flag a hidden block, because it is not there at all', async () => {
      const response = await sync(workerToken, openPageId);
      const ids = (response.body as { blocks: SyncedBlock[] }).blocks.map((block) => block.id);

      expect(ids).not.toContain(hiddenFromWorkerId);
    });
  });
});
