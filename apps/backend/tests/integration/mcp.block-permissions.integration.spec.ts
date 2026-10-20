import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS, BLOCK_ROLE, type PageContent } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_INACCESSIBLE_MESSAGE } from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { callMcpTool, listenForMcp, readMcpText } from '../helpers/mcp.helper';
import { readStoredContent } from '../helpers/mcp.stored-page.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const HTTP_CREATED = 201;
const { pagesRead, pagesWrite } = ACCESS_TOKEN_PERMISSIONS;

const foundShape = z.object({
  blocks: z.array(z.object({ blockId: z.string().optional(), pageId: z.string() })),
  pages: z.array(z.object({ pageId: z.string() })),
});

const WORDS = { hidden: 'Qvartelhimp', open: 'Dorbexanil', readOnly: 'Nulphagrist' };

/**
 * A page the token can read, holding a block that is closed to its owner and another that the owner can only read.
 * The MCP must treat both as the services do: not there, and not editable.
 */
describe('MCP per-block permissions (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let admin: SeededUser;
  let worker: SeededUser;
  let secret = '';
  let spaceId = '';
  let pageId = '';
  const blockIds = { hidden: crypto.randomUUID(), open: crypto.randomUUID(), readOnly: crypto.randomUUID() };

  const paragraph = (id: string, text: string) => ({
    attrs: { id },
    content: [{ text, type: 'text' as const }],
    type: 'paragraph' as const,
  });

  const call = (tool: string, args: Record<string, unknown>) => callMcpTool(baseUrl, secret, tool, args);

  const blockRow = async (blockId: string) => {
    const row = await testApp
      .get(PrismaService)
      .models.Block.select('alive', 'parentId', 'properties', 'text', 'version')
      .where({ id: blockId })
      .first();
    if (row === null) throw new Error(`Expected block ${blockId} to exist`);
    return JSON.stringify(row);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    admin = await createSeededUser(testApp, 'Block Admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'Block Worker', 'WORKER');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    const content: PageContent = {
      content: [
        paragraph(blockIds.open, `Abierto ${WORDS.open}`),
        paragraph(blockIds.hidden, `Cerrado ${WORDS.hidden}`),
        paragraph(blockIds.readOnly, `Solo lectura ${WORDS.readOnly}`),
      ],
      schemaVersion: 1,
      type: 'doc',
    };
    const created = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ content, title: 'Con bloques cerrados' })
      .expect(HTTP_CREATED);
    pageId = (created.body as { id: string }).id;

    const prisma = testApp.get(PrismaService);
    await prisma.models.Block.where({ id: blockIds.hidden }).update({
      permissions: onlyUserPermissions(admin.id, BLOCK_ROLE.full),
    });
    await prisma.models.Block.where({ id: blockIds.readOnly }).update({
      permissions: [
        { principal: { kind: 'user', userId: admin.id }, role: BLOCK_ROLE.full },
        { principal: { kind: 'user', userId: worker.id }, role: BLOCK_ROLE.reader },
      ],
    });

    const issued = await request(testApp.getServer())
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ access: { allSpaces: [pagesRead, pagesWrite], pages: [], spaces: [] }, name: 'Agente de bloques' })
      .expect(HTTP_CREATED);
    secret = (issued.body as { secret: string }).secret;
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('reading', () => {
    it('leaves a closed block out of the page it reads, with its text and its id', async () => {
      const fetched = JSON.stringify((await call('fetch', { address: pageId })).structuredContent);

      expect(fetched).toContain(WORDS.open);
      expect(fetched).toContain(WORDS.readOnly);
      expect(fetched).not.toContain(WORDS.hidden);
      expect(fetched).not.toContain(blockIds.hidden);
    });

    it('answers a closed block opened by its id as it answers one that does not exist', async () => {
      const closed = await call('fetch', { address: blockIds.hidden });
      const missing = await call('fetch', { address: crypto.randomUUID() });

      expect(closed.isError).toBe(true);
      expect(closed.content).toEqual(missing.content);
    });

    it('does not find a closed block by its words', async () => {
      const found = foundShape.parse((await call('search', { query: WORDS.hidden })).structuredContent);

      expect(found.blocks).toEqual([]);
      expect(found.pages).toEqual([]);
    });

    it('finds a block the owner can read', async () => {
      const found = foundShape.parse((await call('search', { query: WORDS.open })).structuredContent);

      expect(found.blocks.some((block) => block.pageId === pageId)).toBe(true);
    });
  });

  describe('writing', () => {
    it('refuses to change a closed block, as for one that does not exist, leaving it as it was', async () => {
      const before = await blockRow(blockIds.hidden);

      const answer = await call('update_block', { block: blockIds.hidden, page: pageId, text: 'Filtrado' });

      expect(readMcpText(answer)).not.toContain(WORDS.hidden);
      expect(answer.isError).toBe(true);
      expect(await blockRow(blockIds.hidden)).toBe(before);
    });

    it('refuses to delete, move or comment on a closed block, leaving it as it was', async () => {
      const before = await blockRow(blockIds.hidden);
      const attempts: readonly (readonly [string, Record<string, unknown>])[] = [
        ['delete_blocks', { blocks: [blockIds.hidden], page: pageId }],
        ['move_blocks', { at: 'start', blocks: [blockIds.hidden], page: pageId }],
        ['comment_on_block', { block: blockIds.hidden, page: pageId, text: 'Ojo' }],
      ];

      const answers = await Promise.all(attempts.map(([tool, args]) => call(tool, args)));

      expect(answers.map((answer) => answer.isError)).toEqual([true, true, true]);
      expect(await blockRow(blockIds.hidden)).toBe(before);
    });

    it('refuses to change or delete a block the owner can only read, leaving it as it was', async () => {
      const before = await blockRow(blockIds.readOnly);

      const changed = await call('update_block', { block: blockIds.readOnly, page: pageId, text: 'Filtrado' });
      const deleted = await call('delete_blocks', { blocks: [blockIds.readOnly], page: pageId });

      expect(changed.isError).toBe(true);
      expect(deleted.isError).toBe(true);
      expect(await blockRow(blockIds.readOnly)).toBe(before);
    });

    it('changes a block the owner can edit, and keeps the closed ones as they were', async () => {
      const hiddenBefore = await blockRow(blockIds.hidden);
      const readOnlyBefore = await blockRow(blockIds.readOnly);

      const answer = await call('update_block', { block: blockIds.open, page: pageId, text: 'Abierto cambiado' });

      expect(answer.isError).toBeUndefined();
      expect(await blockRow(blockIds.hidden)).toBe(hiddenBefore);
      expect(await blockRow(blockIds.readOnly)).toBe(readOnlyBefore);
      expect(await readStoredContent(testApp, admin.token, pageId)).toContain('Abierto cambiado');
      expect(await readStoredContent(testApp, admin.token, pageId)).toContain(WORDS.hidden);
    });

    it('inserts blocks without disturbing the closed ones', async () => {
      const hiddenBefore = await blockRow(blockIds.hidden);

      const answer = await call('insert_blocks', {
        blocks: [{ text: 'Nuevo al final', type: 'paragraph' }],
        page: pageId,
      });

      expect(answer.isError).toBeUndefined();
      expect(await blockRow(blockIds.hidden)).toBe(hiddenBefore);
      expect(await readStoredContent(testApp, admin.token, pageId)).toContain(WORDS.hidden);
    });

    it('answers a write aimed at a closed block with the same words as for a missing one', async () => {
      const missingId = crypto.randomUUID();
      const closed = await call('update_block', { block: blockIds.hidden, page: pageId, text: 'x' });
      const missing = await call('update_block', { block: missingId, page: pageId, text: 'x' });

      expect(readMcpText(closed).replace(blockIds.hidden, 'BLOCK')).toBe(
        readMcpText(missing).replace(missingId, 'BLOCK'),
      );
      expect(readMcpText(closed)).not.toBe(MCP_INACCESSIBLE_MESSAGE);
    });
  });
});
