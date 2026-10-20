import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type JsonObject, SpaceVisibility } from '@neuma/db';
import pino from 'pino';
import request from 'supertest';
import { z } from 'zod';
import { BlockMigrationBatchesService } from '@/modules/blocks/migration/block.migration.batches.service';
import { BlockMigrationPlanService } from '@/modules/blocks/migration/block.migration.plan.service';
import { BlockMigrationService } from '@/modules/blocks/migration/block.migration.service';
import { BlockMigrationRepository } from '@/modules/blocks/migration/infrastructure/persistence/block.migration.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface SyncedBlock {
  children: string[];
  id: string;
  textState: string | null;
  type: string;
}

interface SyncResponse {
  blocks: SyncedBlock[];
}

const PASSWORD = 'plainPassword123';
const FIRST_PAGE_TIME = Date.parse('2026-01-01T00:00:00Z');
const MINUTE_MS = 60_000;

const logger = pino({ level: 'silent' });

const newId = (): string => crypto.randomUUID();

const text = (value: string, marks: object[] = []): object =>
  marks.length === 0 ? { text: value, type: 'text' } : { marks, text: value, type: 'text' };

const paragraph = (id: string, ...content: object[]): object => ({ attrs: { id }, content, type: 'paragraph' });

const jsonObjectSchema = z.record(z.string(), z.json());

const doc = (...content: object[]): JsonObject => jsonObjectSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

describe('Block migration (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let service: BlockMigrationService;
  let adminToken: string;
  let adminId: string;
  let spaceId: string;

  const rootId = newId();
  const duplicateId = newId();
  const collectionId = newId();
  const secondChildId = newId();
  const firstChildId = newId();
  const trashedId = newId();
  const lockedId = newId();
  const rowId = newId();
  const plainParagraphId = newId();
  const richParagraphId = newId();

  const sharedIds = {
    bulletItem: newId(),
    cell: newId(),
    cellItem: newId(),
    collection: newId(),
    heading: newId(),
    subpage: newId(),
    synced: newId(),
    toggle: newId(),
  };

  const rootContent = (): JsonObject =>
    doc(
      { attrs: { id: sharedIds.heading, level: 1 }, content: [text('Roadmap')], type: 'heading' },
      paragraph(richParagraphId, text('See '), text('bold', [{ type: 'strong' }]), {
        attrs: { label: 'Child', pageId: firstChildId, spaceId },
        type: 'mention',
      }),
      paragraph(plainParagraphId, text('Plain')),
      {
        content: [
          {
            attrs: { id: sharedIds.bulletItem },
            content: [{ content: [text('Item')], type: 'paragraph' }],
            type: 'list_item',
          },
        ],
        type: 'bullet_list',
      },
      {
        content: [
          {
            content: [
              {
                attrs: { id: sharedIds.cell },
                content: [
                  {
                    content: [
                      {
                        attrs: { id: sharedIds.cellItem },
                        content: [{ content: [text('In a cell')], type: 'paragraph' }],
                        type: 'list_item',
                      },
                    ],
                    type: 'bullet_list',
                  },
                ],
                type: 'table_cell',
              },
            ],
            type: 'table_row',
          },
        ],
        type: 'table',
      },
      {
        attrs: { id: sharedIds.toggle, open: true, summary: 'More detail' },
        content: [{ content: [text('Hidden')], type: 'paragraph' }],
        type: 'toggle',
      },
      { attrs: { blockId: plainParagraphId, id: sharedIds.synced, pageId: rootId, spaceId }, type: 'synced' },
      { attrs: { id: sharedIds.collection, pageId: collectionId, spaceId }, type: 'collection' },
      { attrs: { id: sharedIds.subpage, label: 'Child', pageId: firstChildId, spaceId }, type: 'subpage' },
    );

  const createPage = async (
    id: string,
    title: string,
    position: number,
    extra: { content?: JsonObject; lockedAt?: Date; order?: number; parentId?: string; trashedAt?: Date } = {},
  ): Promise<void> => {
    await prisma.models.Page.createAndCount([
      {
        content: extra.content ?? doc(paragraph(newId(), text(title))),
        createdAt: new Date(FIRST_PAGE_TIME + position * MINUTE_MS),
        createdById: adminId,
        id,
        lifecycle: extra.trashedAt === undefined ? 'ACTIVE' : 'TRASHED',
        lockedAt: extra.lockedAt ?? null,
        lockedById: extra.lockedAt === undefined ? null : adminId,
        order: extra.order ?? 0,
        parentId: extra.parentId ?? null,
        spaceId,
        title,
        trashedAt: extra.trashedAt ?? null,
        updatedById: adminId,
      },
    ]);
  };

  const sync = async (pageId: string): Promise<SyncResponse> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pageId })
      .expect(200);
    return response.body as SyncResponse;
  };

  const snapshotBlocks = async (): Promise<string> => {
    const rows = await prisma.models.Block.select('id', 'version', 'editedAt')
      .orderBy((block) => block.id.asc())
      .all();
    return JSON.stringify(rows);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const repository = new BlockMigrationRepository(prisma);
    const batches = new BlockMigrationBatchesService(repository);
    service = new BlockMigrationService(repository, new BlockMigrationPlanService(repository, batches), batches);
    await prisma.models.Page.where((page) => page.spaceId.neq('')).deleteAndCount();
    const email = `migration-admin-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Migration Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    adminToken = (await loginUser(testApp, email, PASSWORD)).accessToken;
    adminId = required(await prisma.models.User.where({ email }).first(), 'the admin').id;
    const created = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'migration', slug: `migration-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (created.body as IdResponse).id;

    await createPage(rootId, 'Root', 0, { content: rootContent() });
    await createPage(collectionId, 'Collection', 1, { order: 0, parentId: rootId });
    await createPage(secondChildId, 'Second', 2, { order: 1, parentId: rootId });
    await createPage(firstChildId, 'First', 3, { order: 2, parentId: rootId });
    await createPage(trashedId, 'Trashed', 4, { order: 3, parentId: rootId, trashedAt: new Date() });
    await createPage(lockedId, 'Locked', 5, { lockedAt: new Date() });
    await createPage(rowId, 'Row', 6, { parentId: collectionId });
    await prisma.models.PageSchemaProperty.createAndCount([
      { key: 'title', label: 'Title', order: 0, pageId: collectionId, required: true, type: 'TITLE' },
    ]);
    await createPage(duplicateId, 'Root copy', 7, { content: rootContent() });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('reports pages, blocks and the ids a duplicated page shares, and passes', async () => {
    const report = await service.check(logger);

    expect(report.problems).toEqual([]);
    expect(report.isClean).toBe(true);
    expect(report.pageCount).toBe(8);
    expect(report.alreadyMigratedPageCount).toBe(0);
    expect(report.remaps.length).toBeGreaterThan(0);
    expect(report.remaps.every((remap) => remap.pageId === duplicateId && remap.ownerPageId === rootId)).toBe(true);
    expect(await prisma.models.Block.where((block) => block.spaceId.eq(spaceId)).all()).toHaveLength(0);
  });

  it('migrates, verifies and changes nothing on a second apply', async () => {
    const applied = await service.apply(logger);

    expect(applied.problems).toEqual([]);
    expect(applied.isApplied).toBe(true);
    expect(applied.migratedPageCount).toBe(8);
    expect(applied.verify?.isClean).toBe(true);
    const verified = await service.verify(logger);
    expect(verified.problems).toEqual([]);
    expect(verified.isClean).toBe(true);

    const before = await snapshotBlocks();
    const again = await service.apply(logger);

    expect(again.migratedPageCount).toBe(0);
    expect(again.skippedPageCount).toBe(8);
    expect(again.insertedBlockCount).toBe(0);
    expect(await snapshotBlocks()).toBe(before);
  });

  it('keeps ids, lists child pages after the content in sibling order and copies the page state', async () => {
    const root = required(await prisma.models.Block.where({ id: rootId }).first(), 'the root block');
    const lastChildren = root.children.slice(-4);
    const trashed = required(await prisma.models.Block.where({ id: trashedId }).first(), 'the trashed block');
    const locked = required(await prisma.models.Block.where({ id: lockedId }).first(), 'the locked block');

    expect(lastChildren).toEqual([collectionId, secondChildId, firstChildId, trashedId]);
    expect(root.version).toBe(1);
    expect(root.permissions).toBeNull();
    expect(trashed.lifecycle).toBe('TRASHED');
    expect(trashed.trashedAt).not.toBeNull();
    expect(locked.lockedAt).not.toBeNull();
    expect(locked.lockedById).toBe(adminId);
    expect(await prisma.models.PageSchemaProperty.where({ pageId: collectionId }).all()).toHaveLength(1);
  });

  it('gives the duplicated page new ids, rebuilds links and builds the text state', async () => {
    const copyBlocks = await prisma.models.Block.where({ parentId: duplicateId }).all();
    const copyIds = copyBlocks.map((block) => block.id);
    const links = await prisma.models.BlockLink.where({ sourcePageId: rootId }).all();
    const copyLinks = await prisma.models.BlockLink.where({ sourcePageId: duplicateId }).all();
    const paragraphRow = required(await prisma.models.Block.where({ id: richParagraphId }).first(), 'the paragraph');

    expect(copyIds).not.toContain(richParagraphId);
    expect(links.map((link) => link.kind).toSorted()).toEqual(['collection', 'mention', 'subpage', 'synced']);
    expect(copyLinks).toHaveLength(4);
    expect(paragraphRow.textState).not.toBeNull();
    expect(paragraphRow.text).toBe('See boldChild');
  });

  it('serves a migrated page through sync with its text state', async () => {
    const response = await sync(rootId);
    const paragraphRow = required(
      response.blocks.find((block) => block.id === richParagraphId),
      'the paragraph in sync',
    );

    expect(response.blocks.find((block) => block.id === rootId)?.type).toBe('page');
    expect(paragraphRow.textState).not.toBeNull();
  });

  it('blocks a page with more blocks than one sync read hands out', async () => {
    const rootBlockCount = await prisma.models.Block.where({ parentId: rootId }).all();
    const lowCap = rootBlockCount.length - 1;

    const report = await service.check(logger, lowCap);

    const problem = report.problems.find((entry) => entry.kind === 'page_too_large' && entry.pageId === rootId);
    expect(report.isClean).toBe(false);
    expect(problem?.message).toContain(String(lowCap));
    expect(problem?.message).toContain('blocks');
  });

  it('refuses a toggle summary that looks like a tag, in check and in apply', async () => {
    const taggedId = newId();
    const toggleId = newId();
    await createPage(taggedId, 'Tagged', 8, {
      content: doc({
        attrs: { id: toggleId, summary: '<b>Bold</b>' },
        content: [paragraph(newId(), text('x'))],
        type: 'toggle',
      }),
    });

    const report = await service.check(logger);
    const before = await snapshotBlocks();
    const applied = await service.apply(logger);

    expect(report.isClean).toBe(false);
    expect(
      report.problems.some(
        (problem) =>
          problem.blockId === toggleId && problem.kind === 'tag_like_toggle_summary' && problem.pageId === taggedId,
      ),
    ).toBe(true);
    expect(applied.isApplied).toBe(false);
    expect(await snapshotBlocks()).toBe(before);
    await prisma.models.Page.where({ id: taggedId }).deleteAndCount();
  });
});
