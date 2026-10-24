import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PageLifecycle, SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type PageContent } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import {
  MCP_INACCESSIBLE_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
  MCP_PAGE_MANAGE_REFUSED_MESSAGE,
  MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE,
  MCP_REQUEST_ALREADY_DONE_MESSAGE,
  MCP_WRITTEN_UNREADABLE_NOTE,
} from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, readMcpText } from '../helpers/mcp.helper';
import { listActivePageIdsTitled, readStoredContent, readStoredPage } from '../helpers/mcp.stored-page.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';
const { pagesManage, pagesRead, pagesTrash, pagesWrite } = ACCESS_TOKEN_PERMISSIONS;

const commentedShape = z.object({ comment: z.object({ discussionId: z.string(), id: z.string() }) });
const discussionShape = z.object({
  comments: z.array(z.object({ text: z.string() })),
  id: z.string(),
});
const discussionsShape = z.object({ discussions: z.array(discussionShape) });
const repliedShape = z.object({ discussion: discussionShape });
const trashShape = z.object({
  pages: z.array(
    z.object({
      deletedBy: z.object({ name: z.string() }).nullable(),
      id: z.string(),
      title: z.string(),
      trashedChildCount: z.number(),
    }),
  ),
});
const managedShape = z.object({
  childPages: z.number().optional(),
  page: z.object({ id: z.string(), title: z.string() }),
});

describe('MCP page management (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let ownerToken = '';
  let spaceId = '';
  let tokenCount = 0;

  const api = () => request(testApp.getServer());
  const prisma = () => testApp.get(PrismaService);
  const storedPage = (pageId: string) => readStoredPage(testApp, ownerToken, pageId);

  const createPage = async (title: string, content: PageContent, parentId?: string): Promise<string> => {
    const response = await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content, title, ...(parentId === undefined ? {} : { parentId }) })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const tokenFor = async (rules: Partial<AccessTokenAccess>): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ access: { allSpaces: [], pages: [], spaces: [], ...rules }, name: `Agente ${String(tokenCount)}` })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  const fullToken = () => tokenFor({ allSpaces: [pagesRead, pagesWrite, pagesTrash, pagesManage] });
  const call = (secret: string, name: string, args: Record<string, unknown>) =>
    callMcpTool(baseUrl, secret, name, args);

  const storedContent = (pageId: string): Promise<string> => readStoredContent(testApp, ownerToken, pageId);

  // A block id belongs to one page for good, so every page gets an id of its own.
  const introBlocks = new Map<string, string>();
  const introOf = (pageId: string): string => introBlocks.get(pageId) ?? 'no intro';

  const freshPage = async (title: string, parentId?: string): Promise<string> => {
    const introId = crypto.randomUUID();
    const pageId = await createPage(
      title,
      {
        content: [
          {
            attrs: { id: introId },
            content: [{ text: 'Revisar la fecha de entrega', type: 'text' }],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      },
      parentId,
    );
    introBlocks.set(pageId, introId);
    return pageId;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    const email = `mcp-management-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Ana Pérez', password: PASSWORD });
    await prisma().models.User.where({ email }).update({ role: 'ADMIN' });
    ownerToken = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Gestión', slug: `gestion-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('formato y colores', () => {
    it('writes underlined, coloured and highlighted words, and paints a whole block', async () => {
      const pageId = await freshPage('Formato');
      const secret = await fullToken();

      await call(secret, 'update_block', {
        backgroundColor: 'yellow',
        block: introOf(pageId),
        page: pageId,
        text: '<u>Ojo</u> con la <span color="red">fecha</span> y el <mark color="green">monto</mark>',
      });

      const stored = await storedContent(pageId);
      expect(stored).toContain('"type":"underline"');
      expect(stored).toContain('"type":"text_color"');
      expect(stored).toContain('"color":"red"');
      expect(stored).toContain('"type":"background_color"');
      expect(stored).toContain('"backgroundColor":"yellow"');
      const fetched = await call(secret, 'fetch', { address: pageId });
      expect(readMcpText(fetched)).toContain('<span color="red">fecha</span>');
      expect(readMcpText(fetched)).toContain('backgroundColor="yellow"');
    });
  });

  describe('columnas, tarjetas, videos y bloques sincronizados', () => {
    it('writes columns, a link card, a video and a block synced from another page, and reads them back', async () => {
      const sourceId = await freshPage('Origen');
      const pageId = await freshPage('Bloques nuevos');
      const secret = await fullToken();

      const answer = await call(secret, 'insert_blocks', {
        blocks: [
          {
            columns: [[{ text: 'Izquierda', type: 'paragraph' }], [{ text: 'Derecha', type: 'paragraph' }]],
            type: 'columns',
          },
          { title: 'Guía', type: 'bookmark', url: 'https://example.com/guia' },
          { type: 'embed', url: 'https://www.youtube.com/watch?v=abc' },
          { block: introOf(sourceId), page: sourceId, type: 'synced' },
        ],
        page: pageId,
      });

      expect(answer.isError).toBeUndefined();
      const stored = await storedContent(pageId);
      expect(stored).toContain('"type":"column_list"');
      expect(stored).toContain('"type":"bookmark"');
      expect(stored).toContain('"provider":"youtube"');
      expect(stored).toContain(`"pageId":"${sourceId}"`);
      expect(readMcpText(await call(secret, 'fetch', { address: pageId }))).toContain('title="Guía"');
    });

    it('refuses a synced block that points at a block its page does not have, writing nothing', async () => {
      const sourceId = await freshPage('Origen sin bloque');
      const pageId = await freshPage('Sincronizado roto');
      const before = await storedContent(pageId);

      const answer = await call(await fullToken(), 'insert_blocks', {
        blocks: [{ block: 'no-existe', page: sourceId, type: 'synced' }],
        page: pageId,
      });

      expect(readMcpText(answer)).toContain('no-existe');
      expect(await storedContent(pageId)).toBe(before);
    });
  });

  describe('comentarios', () => {
    let secret = '';

    beforeAll(async () => {
      secret = await fullToken();
    });

    it('opens a discussion on some words of a block, signed by the token owner, and deletes the comment', async () => {
      const pageId = await freshPage('Comentarios');

      const commented = await call(secret, 'comment_on_block', {
        block: introOf(pageId),
        page: pageId,
        quote: 'fecha',
        text: '¿Es la fecha final?',
      });
      const { comment } = commentedShape.parse(commented.structuredContent);

      const stored = await storedContent(pageId);
      expect(stored).toContain('"type":"comment"');
      expect(stored).toContain(comment.discussionId);
      expect(stored).not.toContain('"comments"');
      expect(readMcpText(await call(secret, 'fetch', { address: pageId }))).toContain(
        `Comment ${comment.id} in discussion ${comment.discussionId} by Ana Pérez`,
      );

      await call(secret, 'delete_comment', { block: introOf(pageId), comment: comment.id, page: pageId });

      expect(await storedContent(pageId)).not.toContain(comment.discussionId);
    });

    it('refuses to delete a comment that lives on another page than the one named', async () => {
      const pageId = await freshPage('Página nombrada');
      const otherPageId = await freshPage('Página ajena');
      const commented = await call(secret, 'comment_on_block', {
        block: introOf(otherPageId),
        page: otherPageId,
        text: 'No se borra desde otra página',
      });
      const { comment } = commentedShape.parse(commented.structuredContent);

      const refused = await call(secret, 'delete_comment', {
        block: introOf(pageId),
        comment: comment.id,
        page: pageId,
      });

      expect(refused.isError).toBe(true);
      expect(readMcpText(refused)).toContain(MCP_INACCESSIBLE_MESSAGE);
      const listed = await call(secret, 'list_discussions', { page: otherPageId });
      expect(discussionsShape.parse(listed.structuredContent).discussions).toHaveLength(1);
    });

    it('lists the discussions of a page and replies to one as the token owner', async () => {
      const pageId = await freshPage('Hilos');
      const commented = await call(secret, 'comment_on_block', {
        block: introOf(pageId),
        page: pageId,
        text: '¿Quién revisa esto?',
      });
      const { comment } = commentedShape.parse(commented.structuredContent);

      const replied = await call(secret, 'reply_to_discussion', { discussion: comment.discussionId, text: 'Yo' });
      const listed = await call(secret, 'list_discussions', { page: pageId });

      expect(repliedShape.parse(replied.structuredContent).discussion.comments.map((entry) => entry.text)).toEqual([
        '¿Quién revisa esto?',
        'Yo',
      ]);
      const [discussion] = discussionsShape.parse(listed.structuredContent).discussions;
      expect(discussion?.id).toBe(comment.discussionId);
      expect(discussion?.comments).toHaveLength(2);
    });

    it('hides resolved discussions until asked for them', async () => {
      const pageId = await freshPage('Resueltos');
      const commented = await call(secret, 'comment_on_block', { block: introOf(pageId), page: pageId, text: 'Hecho' });
      const { comment } = commentedShape.parse(commented.structuredContent);
      await api()
        .post(`/api/v1/discussions/${comment.discussionId}/resolve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      const open = await call(secret, 'list_discussions', { page: pageId });
      const all = await call(secret, 'list_discussions', { includeResolved: true, page: pageId });

      expect(discussionsShape.parse(open.structuredContent).discussions).toHaveLength(0);
      expect(discussionsShape.parse(all.structuredContent).discussions).toHaveLength(1);
    });

    it('never shows, lists or lets reply to a discussion on a block its owner cannot read', async () => {
      const pageId = await freshPage('Bloque oculto');
      const strangerEmail = `mcp-stranger-${crypto.randomUUID()}@test.com`;
      const created = await createAccount(testApp, { email: strangerEmail, name: 'Extraña', password: PASSWORD });
      await prisma().models.User.where({ id: created.user.id }).update({ role: 'ADMIN' });
      const stranger = await loginUser(testApp, strangerEmail, PASSWORD);
      const hiddenBlockId = crypto.randomUUID();
      await prisma().models.Block.create({
        createdById: stranger.user.id,
        editedById: stranger.user.id,
        id: hiddenBlockId,
        parentId: pageId,
        permissions: [{ principal: { kind: 'user', userId: stranger.user.id }, role: 'full' }],
        properties: { title: [{ insert: 'Reservado' }] },
        spaceId,
        type: 'paragraph',
      });
      const secretDiscussion = (
        await api()
          .post(`/api/v1/blocks/${hiddenBlockId}/discussions`)
          .set('Authorization', `Bearer ${stranger.accessToken}`)
          .send({ body: [{ insert: 'Confidencial' }] })
          .expect(201)
      ).body as { id: string };

      const listed = await call(secret, 'list_discussions', { page: pageId });
      const fetched = await call(secret, 'fetch', { address: pageId });
      const reply = await call(secret, 'reply_to_discussion', { discussion: secretDiscussion.id, text: 'Intruso' });

      expect(JSON.stringify(listed)).not.toContain('Confidencial');
      expect(readMcpText(fetched)).not.toContain('Confidencial');
      expect(reply.isError).toBe(true);
      expect(readMcpText(reply)).not.toContain('Confidencial');
    });
  });

  describe('tablas', () => {
    it('changes a cell and adds a row, keeping the ids of what it left alone', async () => {
      const ids = {
        cell: crypto.randomUUID(),
        header: crypto.randomUUID(),
        headerRow: crypto.randomUUID(),
        row: crypto.randomUUID(),
        table: crypto.randomUUID(),
      };
      const pageId = await createPage('Tabla', {
        content: [
          {
            attrs: { id: ids.table },
            content: [
              {
                attrs: { id: ids.headerRow },
                content: [
                  {
                    attrs: { id: ids.header },
                    content: [{ content: [{ text: 'Tarea', type: 'text' }], type: 'paragraph' }],
                    type: 'table_header',
                  },
                ],
                type: 'table_row',
              },
              {
                attrs: { id: ids.row },
                content: [
                  {
                    attrs: { id: ids.cell },
                    content: [{ content: [{ text: 'Diseño', type: 'text' }], type: 'paragraph' }],
                    type: 'table_cell',
                  },
                ],
                type: 'table_row',
              },
            ],
            type: 'table',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      });

      const answer = await call(await fullToken(), 'update_table', {
        addRows: [['Pruebas']],
        cells: [{ column: 1, row: 2, text: 'Diseño **final**' }],
        page: pageId,
        table: ids.table,
      });

      expect(answer.isError).toBeUndefined();
      const stored = await storedContent(pageId);
      expect(stored).toContain(`"id":"${ids.cell}"`);
      expect(stored).toContain('final');
      expect(stored).toContain('Pruebas');
    });
  });

  describe('páginas enteras', () => {
    it('renames, gives an emoji and locks a page; a locked page refuses new blocks', async () => {
      const pageId = await freshPage('Viejo nombre');
      const secret = await fullToken();

      const answer = await call(secret, 'update_page', {
        icon: '📌',
        locked: true,
        page: pageId,
        title: 'Nuevo nombre',
      });
      const refused = await call(secret, 'insert_blocks', { blocks: [{ text: 'x', type: 'paragraph' }], page: pageId });

      const page = await storedPage(pageId);
      expect(managedShape.parse(answer.structuredContent).page.title).toBe('Nuevo nombre');
      expect(page.title).toBe('Nuevo nombre');
      expect(JSON.stringify(page.icon)).toContain('📌');
      expect(page.lockedAt).not.toBeNull();
      expect(page.lifecycle).toBe(PageLifecycle.ACTIVE);
      expect(readMcpText(refused)).toBe(MCP_PAGE_LOCKED_MESSAGE);
    });

    it('refuses to lock, vouch for or give an owner without the permission to manage that page, changing nothing', async () => {
      const pageId = await freshPage('Sin gestión');
      const writerOnly = await tokenFor({ allSpaces: [pagesRead, pagesWrite] });
      const closedHere = await tokenFor({
        allSpaces: [pagesRead, pagesWrite, pagesManage],
        pages: [{ pageId, permissions: [pagesRead, pagesWrite] }],
      });

      const answers = await Promise.all([
        call(writerOnly, 'update_page', { locked: true, page: pageId, title: 'Cambiado' }),
        call(closedHere, 'update_page', { page: pageId, verified: true }),
      ]);

      for (const answer of answers) expect(readMcpText(answer)).toBe(MCP_PAGE_MANAGE_REFUSED_MESSAGE);
      const page = await storedPage(pageId);
      expect(page.title).toBe('Sin gestión');
      expect(page.lockedAt).toBeNull();
      expect(page.verifiedAt).toBeNull();
    });

    it('moves a page under another, duplicates it, and sends it with its child to the trash and back', async () => {
      const secret = await fullToken();
      const parentId = await freshPage('Destino');
      const pageId = await freshPage('Viajera');
      const childId = await freshPage('Hija', pageId);

      await call(secret, 'move_page', { page: pageId, parent: parentId });
      const copy = managedShape.parse(
        (await call(secret, 'duplicate_page', { page: pageId, title: 'Copia' })).structuredContent,
      );
      const trashed = managedShape.parse((await call(secret, 'trash_page', { page: pageId })).structuredContent);
      const inTrash = (await Promise.all([pageId, childId].map((id) => storedPage(id)))).filter(
        (page) => page.lifecycle === PageLifecycle.TRASHED,
      );
      const restored = managedShape.parse(
        (await call(secret, 'restore_page', { page: pageId, withChildren: true })).structuredContent,
      );

      const moved = await storedPage(pageId);
      expect(moved.parentId).toBe(parentId);
      expect(moved.lifecycle).toBe(PageLifecycle.ACTIVE);
      expect(copy.page.title).toBe('Copia');
      expect(trashed.childPages).toBe(1);
      expect(inTrash).toHaveLength(2);
      expect(restored.childPages).toBe(0);
      expect((await storedPage(childId)).lifecycle).toBe(PageLifecycle.ACTIVE);
    });

    it('brings back with a page the pages under it that were trashed on their own first, when asked to', async () => {
      const secret = await fullToken();
      const pageId = await freshPage('Madre con hija borrada antes');
      const childId = await freshPage('Hija borrada antes', pageId);
      await call(secret, 'trash_page', { page: childId });
      await call(secret, 'trash_page', { page: pageId });

      const restored = managedShape.parse(
        (await call(secret, 'restore_page', { page: pageId, withChildren: true })).structuredContent,
      );

      expect(restored.childPages).toBe(1);
      expect((await storedPage(childId)).lifecycle).toBe(PageLifecycle.ACTIVE);
    });

    it('refuses to trash a page when a page under it is closed to the token for that, and trashes nothing', async () => {
      const pageId = await freshPage('Con hija protegida');
      const childId = await freshPage('Protegida', pageId);
      const secret = await tokenFor({
        allSpaces: [pagesRead, pagesWrite, pagesTrash],
        pages: [{ pageId: childId, permissions: [pagesRead] }],
      });

      const answer = await call(secret, 'trash_page', { page: pageId });

      expect(readMcpText(answer)).toContain(childId);
      expect((await storedPage(pageId)).lifecycle).toBe(PageLifecycle.ACTIVE);
    });

    it('refuses without naming a page under it that the token may not even read', async () => {
      const pageId = await freshPage('Con hija cerrada');
      const childId = await freshPage('Cerrada', pageId);
      const secret = await tokenFor({
        allSpaces: [pagesRead, pagesWrite, pagesTrash],
        pages: [{ pageId: childId, permissions: [] }],
      });

      const answer = await call(secret, 'trash_page', { page: pageId });

      expect(readMcpText(answer)).toBe(MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE);
      expect((await storedPage(pageId)).lifecycle).toBe(PageLifecycle.ACTIVE);
    });

    it('answers a token that writes but cannot read with ids and the link only', async () => {
      const pageId = await freshPage('Solo escritura');
      const writeOnly = await tokenFor({ allSpaces: [pagesWrite] });

      const answer = await call(writeOnly, 'comment_on_block', {
        block: introOf(pageId),
        page: pageId,
        text: 'Revisado',
      });

      const text = readMcpText(answer);
      expect(text).toContain(MCP_WRITTEN_UNREADABLE_NOTE);
      expect(text).not.toContain('Revisar la fecha de entrega');
      expect(text).not.toContain('Solo escritura');
    });

    it('writes down an attempt the token was refused before writing', async () => {
      const pageId = await freshPage('Intento negado');
      const closedHere = await tokenFor({
        allSpaces: [pagesRead, pagesWrite],
        pages: [{ pageId, permissions: [pagesRead] }],
      });
      const tokenId = (
        await prisma()
          .models.AccessToken.select('id')
          .orderBy((token) => token.createdAt.desc())
          .all()
          .firstOrThrow()
      ).id;

      await call(closedHere, 'insert_blocks', { blocks: [{ text: 'Hola', type: 'paragraph' }], page: pageId });

      const action = await prisma().models.AgentAction.where({ tokenId, tool: 'insert_blocks' }).all().firstOrThrow();
      expect(action.outcome).toBe('REFUSED');
      expect(action.detail).toEqual({ target: pageId });
    });

    it('lists the pages in the trash the token may read, with who trashed them and how many had been trashed on their own', async () => {
      const secret = await fullToken();
      const keptId = await freshPage('Para recuperar');
      const leftChildId = await freshPage('Hija que se fue', keptId);
      await call(secret, 'trash_page', { page: leftChildId });
      const hiddenId = await freshPage('Cerrada al token');
      const closedHere = await tokenFor({
        allSpaces: [pagesRead, pagesWrite],
        pages: [{ pageId: hiddenId, permissions: [] }],
      });
      await Promise.all([call(secret, 'trash_page', { page: keptId }), call(secret, 'trash_page', { page: hiddenId })]);

      const [listed, closedListing] = await Promise.all([
        call(secret, 'list_trash', { space: spaceId }),
        call(closedHere, 'list_trash', { search: 'Cerrada' }),
      ]);

      const trash = trashShape.parse(listed.structuredContent);
      const kept = trash.pages.find((page) => page.id === keptId);
      expect(kept).toMatchObject({ deletedBy: { name: 'Ana Pérez' }, title: 'Para recuperar', trashedChildCount: 1 });
      expect(trash.pages.some((page) => page.id === hiddenId)).toBe(true);
      expect(trashShape.parse(closedListing.structuredContent).pages).toEqual([]);
    });
  });

  describe('reintentos con el mismo id de pedido', () => {
    const countTitled = async (title: string): Promise<number> =>
      (await listActivePageIdsTitled(testApp, spaceId, title)).length;

    it('creates the page once and tells the retry where it is', async () => {
      const secret = await fullToken();
      const title = `Reintento ${String(Date.now())}`;
      const args = { requestId: 'pedido-1', space: spaceId, title };

      await call(secret, 'create_page', args);
      const retry = await call(secret, 'create_page', args);

      const [createdId] = await listActivePageIdsTitled(testApp, spaceId, title);
      expect(await countTitled(title)).toBe(1);
      expect(readMcpText(retry)).toContain(MCP_REQUEST_ALREADY_DONE_MESSAGE);
      expect(readMcpText(retry)).toContain(createdId ?? 'no page');
    });

    it('creates the page once when two calls with the same id arrive together', async () => {
      const secret = await fullToken();
      const title = `A la vez ${String(Date.now())}`;
      const args = { requestId: 'pedido-junto', space: spaceId, title };

      await Promise.all([call(secret, 'create_page', args), call(secret, 'create_page', args)]);

      expect(await countTitled(title)).toBe(1);
    });

    it('lets another token use the same id, and the same token use another id', async () => {
      const [first, second] = await Promise.all([fullToken(), fullToken()]);
      const title = `Por token ${String(Date.now())}`;

      await call(first, 'create_page', { requestId: 'pedido-x', space: spaceId, title });
      await call(second, 'create_page', { requestId: 'pedido-x', space: spaceId, title });
      await call(first, 'create_page', { requestId: 'pedido-y', space: spaceId, title });

      expect(await countTitled(title)).toBe(3);
    });
  });
});
