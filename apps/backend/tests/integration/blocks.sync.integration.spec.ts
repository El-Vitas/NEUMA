import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import request from 'supertest';
import { BLOCK_TREE_MAX_DEPTH } from '@/modules/blocks/constants/blocks.constants';
import { BlockRepository } from '@/modules/blocks/infrastructure/persistence/block.repository';
import { PrismaService } from '@/prisma/prisma.service';
import type { NeumaSqlRunner } from '@/prisma/types/prisma.types';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface SyncedBlock {
  alive: boolean;
  children: string[];
  id: string;
  permissions?: unknown;
  role: string;
  textState: string | null;
}

interface SyncResponse {
  blocks: SyncedBlock[];
  revoked?: string[];
}

interface ErrorResponse {
  error: { code: string; message: string };
}

const PASSWORD = 'plainPassword123';
const MISSING_BLOCK_ID = '00000000-0000-7000-8000-000000000000';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_PAYLOAD_TOO_LARGE = 413;

/** Counts the raw statements a repository sends, so a test can prove how many round trips a read takes. */
class CountingPrismaService extends PrismaService {
  queryCount = 0;

  override get runner(): NeumaSqlRunner {
    return new Proxy(super.runner, {
      get: (target, property) => {
        if (property === 'query') this.queryCount += 1;
        const value: unknown = Reflect.get(target, property);
        if (typeof value !== 'function') return value;
        const bound: unknown = value.bind(target);
        return bound;
      },
    });
  }
}

const required = <Row>(row: Row | null, description: string): Row => {
  if (row === null) throw new Error(`Expected ${description} to exist`);
  return row;
};

describe('POST /sync: block reads (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let workerToken: string;
  let adminId: string;
  let openSpaceId: string;
  let closedSpaceId: string;
  const pageId = crypto.randomUUID();
  const introId = crypto.randomUUID();
  const secretId = crypto.randomUUID();
  const insideSecretId = crypto.randomUUID();
  const removedId = crypto.randomUUID();
  const closedPageId = crypto.randomUUID();
  const parentPageId = crypto.randomUUID();
  const childPageId = crypto.randomUUID();
  const nestedParagraphId = crypto.randomUUID();
  const ownParagraphId = crypto.randomUUID();
  const deepRootId = crypto.randomUUID();

  const sync = (token: string, body: object, expectedStatus = HTTP_OK) =>
    request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectedStatus);

  const createSpace = async (name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const idsOf = (body: unknown): string[] => (body as SyncResponse).blocks.map((block) => block.id);

  const findSynced = (body: unknown, id: string): SyncedBlock =>
    required((body as SyncResponse).blocks.find((block) => block.id === id) ?? null, `block ${id}`);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const timestamp = String(Date.now());
    const adminEmail = `blocks-sync-admin-${timestamp}@test.com`;
    const workerEmail = `blocks-sync-worker-${timestamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Sync Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Sync Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: workerEmail }).update({ role: 'WORKER' });
    adminToken = (await loginUser(testApp, adminEmail, PASSWORD)).accessToken;
    workerToken = (await loginUser(testApp, workerEmail, PASSWORD)).accessToken;
    adminId = required(await prisma.models.User.where({ email: adminEmail }).first(), 'the admin').id;
    openSpaceId = await createSpace('sync-open', SpaceVisibility.PUBLIC_INTERNAL);
    closedSpaceId = await createSpace('sync-closed', SpaceVisibility.RESTRICTED);

    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: adminId, editedById: adminId, spaceId: openSpaceId };
    await blocks.create({
      ...author,
      children: [introId, secretId, removedId],
      id: pageId,
      title: 'Page',
      type: 'page',
    });
    await blocks.create({ ...author, id: introId, parentId: pageId, version: 1 });
    await blocks.create({
      ...author,
      children: [insideSecretId],
      id: secretId,
      parentId: pageId,
      permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      version: 3,
    });
    await blocks.create({ ...author, id: insideSecretId, parentId: secretId });
    await blocks.create({ ...author, alive: false, id: removedId, parentId: pageId, version: 5 });
    await blocks.create({ ...author, id: closedPageId, spaceId: closedSpaceId, type: 'page' });

    await blocks.create({
      ...author,
      children: [childPageId, ownParagraphId],
      id: parentPageId,
      type: 'page',
    });
    await blocks.create({
      ...author,
      children: [nestedParagraphId],
      id: childPageId,
      parentId: parentPageId,
      type: 'page',
    });
    await blocks.create({ ...author, id: nestedParagraphId, parentId: childPageId });
    await blocks.create({ ...author, id: ownParagraphId, parentId: parentPageId });

    const chainIds = Array.from({ length: BLOCK_TREE_MAX_DEPTH + 1 }, () => crypto.randomUUID());
    await blocks.create({ ...author, children: [chainIds[0] ?? ''], id: deepRootId, type: 'page' });
    for (const [index, id] of chainIds.entries()) {
      await blocks.create({
        ...author,
        children: index + 1 < chainIds.length ? [chainIds[index + 1] ?? ''] : [],
        id,
        parentId: index === 0 ? deepRootId : (chainIds[index - 1] ?? ''),
      });
    }
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('with a pageId', () => {
    it('returns the page with its readable subtree, without dead blocks, hidden blocks or permissions', async () => {
      const response = await sync(workerToken, { pageId });

      expect(idsOf(response.body).toSorted()).toEqual([pageId, introId].toSorted());
      expect(findSynced(response.body, pageId).children).toEqual([introId]);
      expect(findSynced(response.body, introId).role).toBe(BLOCK_ROLE.editor);
      for (const block of (response.body as SyncResponse).blocks) {
        expect(block).not.toHaveProperty('permissions');
      }
    });

    it('hands out the text state as base64, and null for a block that has none', async () => {
      await prisma.models.Block.where({ id: introId }).update({ textState: Buffer.from([1, 2, 3]) });

      const response = await sync(workerToken, { pageId });
      const catchUp = await sync(workerToken, { blocks: [{ id: introId, version: 0 }] });

      expect(findSynced(response.body, introId).textState).toBe('AQID');
      expect(findSynced(response.body, pageId).textState).toBeNull();
      expect(findSynced(catchUp.body, introId).textState).toBe('AQID');
      await prisma.models.Block.where({ id: introId }).update({ textState: null });
    });

    it('shows the hidden branch and its permissions to the one it was shared with', async () => {
      const response = await sync(adminToken, { pageId });

      expect(idsOf(response.body)).toContain(secretId);
      expect(idsOf(response.body)).toContain(insideSecretId);
      expect(findSynced(response.body, pageId).children).toEqual([introId, secretId]);
      expect(findSynced(response.body, secretId).permissions).toEqual([
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
      ]);
    });

    it('answers a page in a space the viewer cannot read like a page that does not exist', async () => {
      const closed = await sync(workerToken, { pageId: closedPageId }, HTTP_FORBIDDEN);
      const missing = await sync(workerToken, { pageId: MISSING_BLOCK_ID }, HTTP_FORBIDDEN);

      expect(closed.body).toEqual(missing.body);
      expect((closed.body as ErrorResponse).error.code).toBe('BLOCK_ACCESS_DENIED');
    });
  });

  describe('with the versions a client holds', () => {
    it('returns only the blocks that moved past them, dead ones included, without hidden blocks', async () => {
      const response = await sync(workerToken, {
        blocks: [
          { id: introId, version: 1 },
          { id: pageId, version: 0 },
          { id: removedId, version: 4 },
          { id: secretId, version: 0 },
          { id: MISSING_BLOCK_ID, version: 0 },
        ],
      });

      expect(idsOf(response.body).toSorted()).toEqual([pageId, removedId].toSorted());
      expect(findSynced(response.body, removedId).alive).toBe(false);
      expect(findSynced(response.body, pageId).children).toEqual([introId, removedId]);
    });

    it('lists as revoked the requested blocks that are hidden or gone, not the unchanged readable ones', async () => {
      const response = await sync(workerToken, {
        blocks: [
          { id: introId, version: 1 },
          { id: pageId, version: 0 },
          { id: secretId, version: 0 },
          { id: insideSecretId, version: 0 },
          { id: MISSING_BLOCK_ID, version: 0 },
        ],
      });

      expect((response.body as SyncResponse).revoked?.toSorted()).toEqual(
        [secretId, insideSecretId, MISSING_BLOCK_ID].toSorted(),
      );
    });

    it('returns nothing, and revokes, blocks in a space the viewer cannot read', async () => {
      const response = await sync(workerToken, { blocks: [{ id: closedPageId, version: 0 }] });

      expect((response.body as SyncResponse).blocks).toEqual([]);
      expect((response.body as SyncResponse).revoked).toEqual([closedPageId]);
    });
  });

  describe('opening a page', () => {
    it('returns a child page as a row without opening its blocks', async () => {
      const response = await sync(workerToken, { pageId: parentPageId });

      expect(idsOf(response.body).toSorted()).toEqual([parentPageId, childPageId, ownParagraphId].toSorted());
      expect(findSynced(response.body, childPageId).children).toEqual([]);
    });

    it('opens a child page when it is the requested one', async () => {
      const response = await sync(workerToken, { pageId: childPageId });

      expect(idsOf(response.body).toSorted()).toEqual([childPageId, nestedParagraphId].toSorted());
    });

    it('fails with a typed error instead of dropping blocks nested past the depth limit', async () => {
      const response = await sync(adminToken, { pageId: deepRootId }, HTTP_PAYLOAD_TOO_LARGE);

      expect((response.body as ErrorResponse).error.code).toBe('BLOCK_TREE_TOO_DEEP');
    });
  });

  describe('request validation', () => {
    it('rejects a request that names neither a page nor blocks', async () => {
      await sync(workerToken, {}, HTTP_BAD_REQUEST);
    });

    it('rejects a request that names both', async () => {
      await sync(workerToken, { blocks: [{ id: introId, version: 0 }], pageId }, HTTP_BAD_REQUEST);
    });

    it('rejects more blocks than the cap', async () => {
      const tooMany = Array.from({ length: 501 }, () => ({ id: introId, version: 0 }));

      await sync(workerToken, { blocks: tooMany }, HTTP_BAD_REQUEST);
    });
  });

  describe('BlockRepository', () => {
    it('reads a whole subtree and its ancestors with a single statement', async () => {
      const counting = new CountingPrismaService(testApp.get(ConfigService));
      const repository = new BlockRepository(counting);

      const rows = await repository.readSubtree(pageId);

      expect(counting.queryCount).toBe(1);
      expect(rows.targets.map((record) => record.id).toSorted()).toEqual(
        [pageId, introId, secretId, insideSecretId].toSorted(),
      );
      await counting.onApplicationShutdown();
    });

    it('reads the changed blocks with their context with a single statement', async () => {
      const counting = new CountingPrismaService(testApp.get(ConfigService));
      const repository = new BlockRepository(counting);

      const rows = await repository.readChanged([{ id: insideSecretId, version: 0 }]);

      expect(counting.queryCount).toBe(1);
      expect(rows.targets.map((record) => record.id)).toEqual([insideSecretId]);
      expect(rows.context.map((record) => record.id).toSorted()).toEqual([pageId, secretId].toSorted());
      await counting.onApplicationShutdown();
    });
  });
});
