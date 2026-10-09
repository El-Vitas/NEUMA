import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSION_VALUES, type AccessTokenAccess } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_INACCESSIBLE_MESSAGE } from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, readMcpText } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

const createdShape = z.object({ id: z.string() });

interface WriteCase {
  readonly tool: string;
  readonly args: (place: string) => Record<string, unknown>;
}

const pageWrites: readonly WriteCase[] = [
  { args: (page) => ({ blocks: [{ text: 'Filtrado', type: 'paragraph' }], page }), tool: 'insert_blocks' },
  { args: (page) => ({ block: 'intro', page, text: 'Filtrado' }), tool: 'update_block' },
  { args: (page) => ({ blocks: ['intro'], page }), tool: 'delete_blocks' },
  { args: (page) => ({ after: 'outro', blocks: ['intro'], page }), tool: 'move_blocks' },
  { args: (page) => ({ addRows: [['x']], page, table: 'intro' }), tool: 'update_table' },
  { args: (page) => ({ block: 'intro', page, text: 'Filtrado' }), tool: 'comment_on_block' },
  { args: (page) => ({ block: 'intro', comment: 'comment-1', page }), tool: 'delete_comment' },
  { args: (page) => ({ page, title: 'Filtrado' }), tool: 'update_page' },
  { args: (page) => ({ page, parent: page }), tool: 'move_page' },
  { args: (page) => ({ page }), tool: 'duplicate_page' },
  { args: (page) => ({ page }), tool: 'trash_page' },
  { args: (page) => ({ page }), tool: 'restore_page' },
  { args: (parent) => ({ parent, title: 'Filtrado' }), tool: 'create_page' },
];

const collectionWrites: readonly WriteCase[] = [
  { args: (collection) => ({ collection }), tool: 'get_collection' },
  { args: (collection) => ({ collection }), tool: 'query_collection' },
  { args: (collection) => ({ collection, title: 'Filtrada' }), tool: 'create_row' },
  { args: (collection) => ({ collection, name: 'Otra', type: 'TABLE' }), tool: 'create_view' },
  { args: (collection) => ({ collection, name: 'Otra', view: 'Tabla' }), tool: 'update_view' },
  { args: (collection) => ({ collection, view: 'Tabla' }), tool: 'delete_view' },
  {
    args: (collection) => ({ addColumns: [{ name: 'Fecha', type: 'DATE' }], collection }),
    tool: 'update_collection_columns',
  },
];

describe('MCP closed places (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let ownerToken = '';
  let spaceId = '';
  let closedPageId = '';
  let closedCollectionId = '';
  let closedRowId = '';
  let openPageId = '';
  let everything = '';
  let tokenCount = 0;

  const api = () => request(testApp.getServer());

  const createToken = async (rules: Partial<AccessTokenAccess>): Promise<{ id: string; secret: string }> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        access: { allSpaces: [], pages: [], spaces: [], ...rules },
        name: `Agente cerrado ${String(tokenCount)}`,
      })
      .expect(201);
    const body = response.body as { secret: string; token: { id: string } };
    return { id: body.token.id, secret: body.secret };
  };

  const call = (secret: string, tool: string, args: Record<string, unknown>) =>
    callMcpTool(baseUrl, secret, tool, args);

  const createdId = async (tool: string, args: Record<string, unknown>): Promise<string> =>
    createdShape.parse((await call(everything, tool, args)).structuredContent).id;

  const snapshotOf = async (pageId: string): Promise<string> => {
    const prisma = testApp.get(PrismaService);
    const [page, children] = await Promise.all([
      prisma.page.findUniqueOrThrow({
        select: {
          content: true,
          lifecycle: true,
          parentId: true,
          schemaProperties: true,
          title: true,
          updatedAt: true,
        },
        where: { id: pageId },
      }),
      prisma.page.count({ where: { parentId: pageId } }),
    ]);
    return JSON.stringify({ children, page });
  };

  const actionsDoneOn = (pageId: string) =>
    testApp.get(PrismaService).agentAction.count({ where: { outcome: 'DONE', pageId } });

  /** Fresh token per case (the call cap is per token), revoked after (live tokens cannot share a name). */
  const asClosingToken = async <TResult>(act: (secret: string) => Promise<TResult>): Promise<TResult> => {
    const token = await createToken({
      allSpaces: [...ACCESS_TOKEN_PERMISSION_VALUES],
      pages: [
        { pageId: closedPageId, permissions: [] },
        { pageId: closedCollectionId, permissions: [] },
      ],
    });
    try {
      return await act(token.secret);
    } finally {
      await api().delete(`/api/v1/access-tokens/${token.id}`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    }
  };

  const answersFor = (tool: string, args: (place: string) => Record<string, unknown>, place: string) =>
    asClosingToken(async (secret) => ({
      closed: readMcpText(await call(secret, tool, args(place))),
      missing: readMcpText(await call(secret, tool, args(randomUUID()))),
    }));

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    const email = `mcp-closed-${String(Date.now())}@test.com`;
    await registerUser(testApp, { email, name: 'Ana Pérez', password: PASSWORD });
    await testApp.get(PrismaService).user.update({ data: { role: 'ADMIN' }, where: { email } });
    ownerToken = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cerrados', slug: `cerrados-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;

    everything = (await createToken({ allSpaces: [...ACCESS_TOKEN_PERMISSION_VALUES] })).secret;
    const blocks = [
      { text: 'Introducción', type: 'paragraph' },
      { text: 'Cierre', type: 'paragraph' },
    ];
    openPageId = await createdId('create_page', { blocks, space: spaceId, title: 'Abierta' });
    closedPageId = await createdId('create_page', { blocks, space: spaceId, title: 'Sueldos' });
    closedCollectionId = await createdId('create_collection', {
      space: spaceId,
      title: 'Bonos',
      titleColumn: 'Nombre',
      viewName: 'Tabla',
    });
    closedRowId = await createdId('create_row', { collection: closedCollectionId, title: 'Bono de Ana' });
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe.each([...pageWrites])('$tool on a closed page', ({ args, tool }) => {
    it('answers as for a page that does not exist, and leaves the page as it was', async () => {
      const before = await snapshotOf(closedPageId);
      const doneBefore = await actionsDoneOn(closedPageId);

      const { closed, missing } = await answersFor(tool, args, closedPageId);

      expect(closed).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect(closed).toBe(missing);
      expect(await snapshotOf(closedPageId)).toBe(before);
      expect(await actionsDoneOn(closedPageId)).toBe(doneBefore);
    });
  });

  describe.each([...collectionWrites])('$tool on a closed collection', ({ args, tool }) => {
    it('answers as for a collection that does not exist, and leaves it as it was', async () => {
      const before = await snapshotOf(closedCollectionId);

      const { closed, missing } = await answersFor(tool, args, closedCollectionId);

      expect(closed).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect(closed).toBe(missing);
      expect(await snapshotOf(closedCollectionId)).toBe(before);
    });
  });

  it('does not change a row of a closed collection, and answers as for a row that does not exist', async () => {
    const before = await snapshotOf(closedRowId);

    const { closed, missing } = await answersFor('update_row', (row) => ({ row, title: 'Filtrada' }), closedRowId);

    expect(closed).toBe(MCP_INACCESSIBLE_MESSAGE);
    expect(closed).toBe(missing);
    expect(await snapshotOf(closedRowId)).toBe(before);
  });

  it('does not move an open page into a closed one', async () => {
    const target = await snapshotOf(closedPageId);
    const moved = await snapshotOf(openPageId);

    const answer = await asClosingToken(async (secret) =>
      readMcpText(await call(secret, 'move_page', { page: openPageId, parent: closedPageId })),
    );

    expect(answer).toBe(MCP_INACCESSIBLE_MESSAGE);
    expect(await snapshotOf(closedPageId)).toBe(target);
    expect(await snapshotOf(openPageId)).toBe(moved);
  });
});
