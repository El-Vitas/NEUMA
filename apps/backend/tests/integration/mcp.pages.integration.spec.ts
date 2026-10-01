import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type PageContent } from '@company-brain/shared';
import request from 'supertest';
import { z } from 'zod';
import {
  MCP_INACCESSIBLE_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
  MCP_UNREACHABLE_REFERENCE_MESSAGE,
} from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, readMcpText } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';
const { collectionsConfigure, collectionsRead, pagesRead, pagesWrite } = ACCESS_TOKEN_PERMISSIONS;

interface Session {
  readonly id: string;
  readonly token: string;
}

const writtenShape = z.object({ blockIds: z.array(z.string()), markdown: z.string() });
const createdShape = z.object({ id: z.string(), markdown: z.string() });

/**
 * Lo que un agente escribe en una página, de punta a punta: cliente MCP por
 * HTTP, documento en vivo y Postgres. Cada caso mira lo guardado, no solo la
 * respuesta: lo rechazado tiene que no haber tocado la página.
 */
describe('MCP page writes (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let owner: Session;
  let spaceId = '';
  let otherSpaceId = '';
  let openPageId = '';
  let closedPageId = '';
  let tokenCount = 0;

  const api = () => request(testApp.getServer());

  const signUp = async (): Promise<Session> => {
    const email = `mcp-pages-${String(Date.now())}@test.com`;
    await registerUser(testApp, { email, name: 'Ana Pérez', password: PASSWORD });
    await testApp.get(PrismaService).user.update({ data: { role: 'ADMIN' }, where: { email } });
    const session = await loginUser(testApp, email, PASSWORD);
    return { id: session.user.id, token: session.accessToken };
  };

  const createSpace = async (name: string): Promise<string> => {
    const response = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name, slug: `${name.toLowerCase()}-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createPage = async (title: string, content: PageContent): Promise<string> => {
    const response = await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content, title })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const tokenFor = async (rules: Partial<AccessTokenAccess>): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        access: { allSpaces: [], pages: [], spaces: [], ...rules },
        name: `Agente de páginas ${String(tokenCount)}`,
      })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  /** Un token que lee y escribe en todas partes, salvo en la página cerrada. */
  const writerToken = () =>
    tokenFor({ allSpaces: [pagesRead, pagesWrite], pages: [{ pageId: closedPageId, permissions: [] }] });

  const call = (secret: string, name: string, args: Record<string, unknown>) =>
    callMcpTool(baseUrl, secret, name, args);

  const storedContent = async (pageId: string): Promise<string> => {
    const page = await testApp
      .get(PrismaService)
      .page.findUniqueOrThrow({ select: { content: true }, where: { id: pageId } });
    return JSON.stringify(page.content);
  };

  const outcomesOn = async (pageId: string) =>
    (
      await testApp.get(PrismaService).agentAction.findMany({
        orderBy: { createdAt: 'asc' },
        select: { outcome: true, tool: true },
        where: { pageId },
      })
    ).map((action) => `${action.tool}:${action.outcome}`);

  const freshPage = (title: string) =>
    createPage(title, {
      content: [
        { attrs: { id: 'intro' }, content: [{ text: 'Introducción', type: 'text' }], type: 'paragraph' },
        { attrs: { id: 'outro' }, content: [{ text: 'Cierre', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    owner = await signUp();
    spaceId = await createSpace('Documentos');
    otherSpaceId = await createSpace('Otro');
    openPageId = await freshPage('Runbook');
    closedPageId = await freshPage('Sueldos');
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('qué se le ofrece a cada token', () => {
    it('never offers a token that only reads pages a tool that writes them', async () => {
      const offered = await listMcpToolNames(baseUrl, await tokenFor({ allSpaces: [pagesRead] }));

      expect(offered).toContain('fetch');
      expect(offered).not.toContain('insert_blocks');
      expect(offered).not.toContain('create_page');
    });
  });

  describe('crear una página', () => {
    it('creates a page with a real table and a code block kept exactly as written', async () => {
      const diagram = '┌──┐\n│ a │\n└──┘';

      const answer = await call(await writerToken(), 'create_page', {
        blocks: [
          { level: 1, text: 'Servicios', type: 'heading' },
          { header: ['Servicio', 'Estado'], rows: [['Portal', '**OK**']], type: 'table' },
          { language: 'plain', text: diagram, type: 'code_block' },
        ],
        space: spaceId,
        title: 'Estado de servicios',
      });

      expect(answer.isError).toBeUndefined();
      const created = createdShape.parse(answer.structuredContent);
      const stored = await storedContent(created.id);
      expect(stored).toContain('"type":"table_header"');
      expect(stored).toContain('"marks":[{"type":"strong"}]');
      expect(stored).toContain(JSON.stringify(diagram));
      const recorded = await testApp.get(PrismaService).agentAction.findMany({
        select: { detail: true, outcome: true },
        where: { tool: 'create_page' },
      });
      expect(recorded).toContainEqual({ detail: { title: 'Estado de servicios' }, outcome: 'DONE' });
    });

    it('refuses to create a page in a space where the token does not write, creating nothing', async () => {
      const secret = await tokenFor({
        allSpaces: [pagesRead],
        spaces: [{ permissions: [pagesRead, pagesWrite], spaceId: otherSpaceId }],
      });
      const before = await testApp.get(PrismaService).page.count({ where: { spaceId } });

      const answer = await call(secret, 'create_page', { space: spaceId, title: 'No debería existir' });

      expect(readMcpText(answer)).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect(await testApp.get(PrismaService).page.count({ where: { spaceId } })).toBe(before);
    });
  });

  describe('escribir bloques', () => {
    it('inserts blocks where the agent says, returns their ids, and records the write', async () => {
      const pageId = await freshPage('Insertar');

      const answer = await call(await writerToken(), 'insert_blocks', {
        after: 'intro',
        blocks: [{ items: ['Uno', 'Dos'], type: 'bullet_list' }],
        page: pageId,
      });

      const written = writtenShape.parse(answer.structuredContent);
      const stored = await storedContent(pageId);
      expect(stored.indexOf('Introducción')).toBeLessThan(stored.indexOf('Uno'));
      expect(stored.indexOf('Dos')).toBeLessThan(stored.indexOf('Cierre'));
      expect(stored).toContain(written.blockIds[0] ?? 'no id');
      expect(await outcomesOn(pageId)).toEqual(['insert_blocks:DONE']);
    });

    it('changes a block and keeps its id, so its links keep working', async () => {
      const pageId = await freshPage('Cambiar');

      await call(await writerToken(), 'update_block', { block: 'intro', page: pageId, text: 'Introducción *nueva*' });

      const stored = await storedContent(pageId);
      expect(stored).toContain('"id":"intro"');
      expect(stored).toContain('"marks":[{"type":"em"}]');
      expect(stored).not.toContain('Introducción"');
    });

    it('moves and removes blocks', async () => {
      const pageId = await freshPage('Mover');
      const secret = await writerToken();

      await call(secret, 'move_blocks', { at: 'start', blocks: ['outro'], page: pageId });
      const moved = await storedContent(pageId);
      expect(moved.indexOf('Cierre')).toBeLessThan(moved.indexOf('Introducción'));

      await call(secret, 'delete_blocks', { blocks: ['intro'], page: pageId });
      expect(await storedContent(pageId)).not.toContain('Introducción');
    });

    it('writes nothing when a block is gone, and says so', async () => {
      const pageId = await freshPage('Sin bloque');
      const before = await storedContent(pageId);

      const answer = await call(await writerToken(), 'delete_blocks', { blocks: ['intro', 'missing'], page: pageId });

      expect(readMcpText(answer)).toContain('missing');
      expect(await storedContent(pageId)).toBe(before);
      expect(await outcomesOn(pageId)).toEqual(['delete_blocks:REFUSED']);
    });

    it('refuses to write on a locked page, leaving it as it was', async () => {
      const pageId = await freshPage('Bloqueada');
      await api()
        .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/lock`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ locked: true })
        .expect(200);
      const before = await storedContent(pageId);

      const answer = await call(await writerToken(), 'insert_blocks', {
        blocks: [{ text: 'No', type: 'paragraph' }],
        page: pageId,
      });

      expect(readMcpText(answer)).toBe(MCP_PAGE_LOCKED_MESSAGE);
      expect(await storedContent(pageId)).toBe(before);
    });
  });

  describe('todo lo que ofrece el menú de bloques', () => {
    it('writes diagrams, formulas, a table of contents and a button the way the editor keeps them', async () => {
      const pageId = await freshPage('Bloques avanzados');

      const answer = await call(await writerToken(), 'insert_blocks', {
        blocks: [
          { source: 'sequenceDiagram\n  Agente->>Brain: escribe', type: 'diagram' },
          { latex: 'e^{i\\pi} + 1 = 0', type: 'formula', view: 'both' },
          { type: 'table_of_contents' },
          { label: 'Anotar', place: 'bottom', text: 'Nota del día $x^2$', type: 'button' },
        ],
        page: pageId,
      });

      expect(answer.isError).toBeUndefined();
      const stored = await storedContent(pageId);
      expect(stored).toContain('"language":"mermaid"');
      expect(stored).toContain('"shown":"both"');
      expect(stored).toContain('"type":"table_of_contents"');
      expect(stored).toContain('"deed":"blocks"');
      expect(stored).toContain('"type":"formula"');
    });

    it('draws a diagram with product logos when every icon it names exists', async () => {
      const pageId = await freshPage('Arquitectura');

      const answer = await call(await writerToken(), 'insert_blocks', {
        blocks: [
          {
            source:
              'architecture-beta\n  group api(cloud)[API]\n  service db(logos:postgresql)[Base] in api\n  service web(logos:nextjs-icon)[Portal] in api\n  db:L -- R:web',
            type: 'diagram',
          },
        ],
        page: pageId,
      });

      expect(answer.isError).toBeUndefined();
      expect(await storedContent(pageId)).toContain('logos:postgresql');
    });

    /** Se rechaza antes de tocar la página, así que no hay escritura que anotar: el rechazo queda en el log de llamadas. */
    it('refuses a diagram Mermaid cannot read, writing nothing and saying where it broke', async () => {
      const pageId = await freshPage('Diagrama roto');
      const before = await storedContent(pageId);

      const answer = await call(await writerToken(), 'insert_blocks', {
        blocks: [
          { text: 'Antes del diagrama', type: 'paragraph' },
          { source: 'architecture-beta\n    service backend["NestJS", logo:logos:nestjs]', type: 'diagram' },
        ],
        page: pageId,
      });

      expect(answer.isError).toBe(true);
      expect(readMcpText(answer)).toStartWith('Block 2: the diagram cannot be drawn.');
      expect(await storedContent(pageId)).toBe(before);
      expect(await outcomesOn(pageId)).toEqual([]);
    });

    it('refuses a diagram that names an icon Company Brain cannot draw', async () => {
      const pageId = await freshPage('Ícono inventado');

      const answer = await call(await writerToken(), 'insert_blocks', {
        blocks: [{ source: 'architecture-beta\n  service db(logos:unicornio)[Base]', type: 'diagram' }],
        page: pageId,
      });

      expect(readMcpText(answer)).toContain('logos:unicornio');
      expect(await storedContent(pageId)).not.toContain('unicornio');
    });

    it('refuses a formula KaTeX cannot set, inside a sentence too, and a diagram broken by a later change', async () => {
      const pageId = await freshPage('Fórmulas rotas');
      const secret = await writerToken();
      const inserted = writtenShape.parse(
        (
          await call(secret, 'insert_blocks', {
            blocks: [{ source: 'pie title Tareas\n  "Hechas" : 7', type: 'diagram' }],
            page: pageId,
          })
        ).structuredContent,
      );
      const before = await storedContent(pageId);

      const sentence = await call(secret, 'update_block', { block: 'intro', page: pageId, text: 'Vale $\\frac{a}{$' });
      const diagram = await call(secret, 'update_block', {
        block: inserted.blockIds[0] ?? 'no id',
        page: pageId,
        text: 'pie title Tareas\n  "Hechas" 7',
      });

      expect(readMcpText(sentence)).toContain('KaTeX says');
      expect(readMcpText(diagram)).toContain('Mermaid says');
      expect(await storedContent(pageId)).toBe(before);
    });

    it('shows a sub-page with the name it has today', async () => {
      const pageId = await freshPage('Con subpágina');

      await call(await writerToken(), 'insert_blocks', {
        blocks: [{ page: openPageId, type: 'subpage' }],
        page: pageId,
      });

      expect(await storedContent(pageId)).toContain('"label":"Runbook"');
    });

    it('creates a collection with its columns, and embeds it in a page through a view named loosely', async () => {
      const secret = await tokenFor({ allSpaces: [pagesRead, pagesWrite, collectionsRead, collectionsConfigure] });

      const created = await call(secret, 'create_collection', {
        columns: [{ name: 'Estado', options: ['Pendiente', 'Hecho'], type: 'SELECT' }],
        space: spaceId,
        title: 'Seguimiento',
        titleColumn: 'Nombre',
        viewName: 'Tabla',
      });
      const collectionId = z.object({ id: z.string() }).parse(created.structuredContent).id;
      const schema = await testApp.get(PrismaService).pageSchemaView.findMany({ where: { pageId: collectionId } });
      expect(schema.map((view) => view.name)).toEqual(['Tabla']);

      const pageId = await freshPage('Con colección');
      await call(secret, 'insert_blocks', {
        blocks: [{ collection: collectionId, type: 'collection', view: 'tabla' }],
        page: pageId,
      });
      expect(await storedContent(pageId)).toContain('"viewName":"Tabla"');

      const before = await storedContent(pageId);
      const wrongView = await call(secret, 'insert_blocks', {
        blocks: [{ collection: collectionId, type: 'collection', view: 'Calendario' }],
        page: pageId,
      });
      expect(readMcpText(wrongView)).toContain('Its views are: Tabla');
      const notACollection = await call(secret, 'insert_blocks', {
        blocks: [{ collection: openPageId, type: 'collection' }],
        page: pageId,
      });
      expect(readMcpText(notACollection)).toContain('not a collection');
      expect(await storedContent(pageId)).toBe(before);
    });

    it('never offers a token that cannot configure collections the tool that creates one', async () => {
      expect(await listMcpToolNames(baseUrl, await writerToken())).not.toContain('create_collection');
    });
  });

  describe('lo que el token cierra', () => {
    it('answers a write to a closed page as if it did not exist, and leaves it as it was', async () => {
      const before = await storedContent(closedPageId);

      const answer = await call(await writerToken(), 'update_block', {
        block: 'intro',
        page: closedPageId,
        text: 'Filtrado',
      });

      expect(readMcpText(answer)).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect(await storedContent(closedPageId)).toBe(before);
    });

    it('stores a mention with the name the page has, and refuses one to a closed page without writing', async () => {
      const pageId = await freshPage('Menciones');
      const secret = await writerToken();

      await call(secret, 'insert_blocks', {
        blocks: [{ text: `Ver [como sea](/spaces/${spaceId}/pages/${openPageId})`, type: 'paragraph' }],
        page: pageId,
      });
      expect(await storedContent(pageId)).toContain('"label":"Runbook"');

      const before = await storedContent(pageId);
      const refused = await call(secret, 'insert_blocks', {
        blocks: [{ text: `Ver [Sueldos](/spaces/${spaceId}/pages/${closedPageId})`, type: 'paragraph' }],
        page: pageId,
      });
      expect(readMcpText(refused)).toBe(MCP_UNREACHABLE_REFERENCE_MESSAGE);
      expect(await storedContent(pageId)).toBe(before);
    });
  });
});
