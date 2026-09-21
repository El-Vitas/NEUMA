import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { SpaceVisibility } from '@company-brain/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type PageContent } from '@company-brain/shared';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import request from 'supertest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { drainSearchProjection } from '../helpers/search.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const MCP_PATH = '/api/v1/mcp';
const TOKENS_PATH = '/api/v1/access-tokens';
const PASSWORD = 'plainPassword123';

interface Session {
  readonly id: string;
  readonly token: string;
}

interface ToolText {
  readonly content: readonly { readonly text?: string }[];
  readonly isError?: boolean;
  readonly structuredContent?: unknown;
}

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;

/** Lo que contesta cada herramienta se lee con forma: si cambiara, la prueba lo dice en vez de leer vacío. */
const listedSpacesShape = z.object({ spaces: z.array(z.object({ id: z.string() })) });
const foundPagesShape = z.object({ items: z.array(z.object({ sourceId: z.string() })) });

/**
 * Lo que puede y no puede un agente, recorrido de punta a punta: token creado
 * por la API, agente conectado por HTTP con un cliente MCP de verdad, y datos
 * en Postgres. Cada caso intenta saltarse un filtro por un lado distinto.
 */
describe('MCP access (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let admin: Session;
  let worker: Session;
  let reader: Session;
  const spaces = { open: '', restricted: '', workerPrivate: '' };
  const pages = { open: '', restricted: '', workerPrivate: '' };
  const words = { open: '', restricted: '', workerPrivate: '' };

  const signUp = async (label: string, role: 'ADMIN' | 'CLIENT' | 'WORKER'): Promise<Session> => {
    const email = `mcp-access-${label}-${String(Date.now())}@test.com`;
    await registerUser(testApp, { email, name: `MCP ${label}`, password: PASSWORD });
    await testApp.get(PrismaService).user.update({ data: { role }, where: { email } });
    const session = await loginUser(testApp, email, PASSWORD);
    return { id: session.user.id, token: session.accessToken };
  };

  const createSpace = async (owner: Session, name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name, slug: `${name.toLowerCase()}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  /** El espacio privado nace solo la primera vez que su dueña lista sus espacios, como en la pantalla. */
  const privateSpaceOf = async (owner: Session): Promise<string> => {
    const response = await request(testApp.getServer())
      .get('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    const listed = response.body as { id: string; visibility: string }[];
    const privateSpace = listed.find((space) => space.visibility === SpaceVisibility.PRIVATE);
    if (privateSpace === undefined) throw new Error('The owner has no private space after listing spaces');
    return privateSpace.id;
  };

  const createPage = async (owner: Session, spaceId: string, word: string): Promise<string> => {
    const content: PageContent = {
      content: [{ content: [{ text: word, type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content, title: word })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const askForToken = (owner: Session, access: AccessTokenAccess) =>
    request(testApp.getServer())
      .post(TOKENS_PATH)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ access, name: 'Agente de prueba' });

  const tokenFor = async (owner: Session, access: AccessTokenAccess): Promise<string> =>
    ((await askForToken(owner, access).expect(201)).body as { secret: string }).secret;

  const connect = async (secret: string): Promise<Client> => {
    const client = new Client({ name: 'mcp-access-test', version: '0.0.1' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${baseUrl}${MCP_PATH}`), {
        requestInit: { headers: { Authorization: `Bearer ${secret}` } },
      }),
    );
    return client;
  };

  const call = async (secret: string, name: string, args: Record<string, unknown>): Promise<ToolText> => {
    const client = await connect(secret);
    const result = (await client.callTool({ arguments: args, name })) as ToolText;
    await client.close();
    return result;
  };

  const listedSpaceIds = async (secret: string): Promise<readonly string[]> => {
    const result = await call(secret, 'list_spaces', {});
    return listedSpacesShape.parse(result.structuredContent).spaces.map((space) => space.id);
  };

  const foundPageIds = async (secret: string, query: string, spaceId?: string): Promise<readonly string[]> => {
    const result = await call(secret, 'search_company_brain', spaceId === undefined ? { query } : { query, spaceId });
    return foundPagesShape.parse(result.structuredContent).items.map((item) => item.sourceId);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    await testApp.app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${String((testApp.getServer().address() as AddressInfo).port)}`;

    admin = await signUp('admin', 'ADMIN');
    worker = await signUp('worker', 'WORKER');
    reader = await signUp('reader', 'CLIENT');

    /*
      Palabras sin nada en común. La búsqueda también empareja por parecido, y
      tres palabras con el mismo número al final se encontrarían entre sí: un
      falso resultado que taparía una fuga de verdad o inventaría una.
    */
    words.open = 'Zorbanique';
    words.restricted = 'Quelvarth';
    words.workerPrivate = 'Mipsotrel';

    spaces.open = await createSpace(admin, 'Abierto', SpaceVisibility.PUBLIC_INTERNAL);
    spaces.restricted = await createSpace(admin, 'Restringido', SpaceVisibility.RESTRICTED);
    spaces.workerPrivate = await privateSpaceOf(worker);
    await testApp.get(PrismaService).spaceMember.create({ data: { spaceId: spaces.restricted, userId: worker.id } });

    pages.open = await createPage(admin, spaces.open, words.open);
    pages.restricted = await createPage(admin, spaces.restricted, words.restricted);
    pages.workerPrivate = await createPage(worker, spaces.workerPrivate, words.workerPrivate);
    await drainSearchProjection(testApp);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('un token limitado a un espacio', () => {
    let secret: string;

    beforeAll(async () => {
      secret = await tokenFor(worker, { allSpaces: [], spaces: [{ permissions: [read], spaceId: spaces.open }] });
    });

    it('lists only that space, although its owner sees more', async () => {
      expect(await listedSpaceIds(secret)).toEqual([spaces.open]);
    });

    it('finds what is in that space and nothing that is outside it', async () => {
      expect(await foundPageIds(secret, words.open)).toContain(pages.open);
      const outside = await foundPageIds(secret, words.restricted);
      expect(outside).not.toContain(pages.restricted);
      expect(outside).toEqual([]);
    });

    /** El espacio que pide el agente solo achica la búsqueda: nombrar otro no abre la puerta. */
    it('cannot widen the search by naming a space it was not given', async () => {
      const widened = await foundPageIds(secret, words.restricted, spaces.restricted);
      expect(widened).not.toContain(pages.restricted);
      expect(widened).toEqual([]);
    });

    /** Pedir la página directo por su id tampoco sirve, y la respuesta no confirma que exista. */
    it('cannot read a page outside that space by its id, and is not told the page exists', async () => {
      const refused = await call(secret, 'read_page', { pageId: pages.restricted });
      const missing = await call(secret, 'read_page', { pageId: '00000000-0000-4000-8000-000000000000' });

      expect(refused.isError).toBe(true);
      expect(refused.content).toEqual(missing.content);
    });

    it('reads a page inside that space', async () => {
      expect((await call(secret, 'read_page', { pageId: pages.open })).isError).not.toBe(true);
    });
  });

  describe('un token de lectura en todos los espacios', () => {
    it('sees everything its owner sees, own private space included', async () => {
      const secret = await tokenFor(worker, { allSpaces: [read], spaces: [] });

      const listed = await listedSpaceIds(secret);

      expect(listed).toContain(spaces.open);
      expect(listed).toContain(spaces.restricted);
      expect(listed).toContain(spaces.workerPrivate);
    });

    /** Lo privado responde a su dueña, y a nadie por encima de ella: ni al token de un administrador. */
    it('of an admin never reaches someone else’s private space', async () => {
      const secret = await tokenFor(admin, { allSpaces: [read], spaces: [] });

      expect(await listedSpaceIds(secret)).not.toContain(spaces.workerPrivate);
      const found = await foundPageIds(secret, words.workerPrivate);
      expect(found).not.toContain(pages.workerPrivate);
      expect(found).toEqual([]);
      expect((await call(secret, 'read_page', { pageId: pages.workerPrivate })).isError).toBe(true);
    });
  });

  describe('lo que un dueño no puede dar', () => {
    it('refuses a token naming a private space its creator does not own, even for an admin', async () => {
      const refused = await askForToken(admin, {
        allSpaces: [],
        spaces: [{ permissions: [read], spaceId: spaces.workerPrivate }],
      }).expect(403);

      expect((refused.body as { error: { code: string } }).error.code).toBe('ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE');
    });

    it('refuses a token naming a restricted space its creator is not a member of', async () => {
      await askForToken(reader, {
        allSpaces: [],
        spaces: [{ permissions: [read], spaceId: spaces.restricted }],
      }).expect(403);
    });

    /** Quien solo lee no fabrica una llave que escriba por él. */
    it('refuses writing permissions to someone who can only read', async () => {
      const refused = await askForToken(reader, {
        allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
        spaces: [],
      }).expect(403);

      expect((refused.body as { error: { code: string } }).error.code).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
    });

    it('refuses a permission the catalogue does not know', async () => {
      await request(testApp.getServer())
        .post(TOKENS_PATH)
        .set('Authorization', `Bearer ${worker.token}`)
        .send({ access: { allSpaces: ['pages:everything'], spaces: [] }, name: 'Inventado' })
        .expect(400);
    });
  });

  describe('lo que cambia después de darlo', () => {
    /** Lo que el dueño ve se mira en cada llamada: si lo sacan de un espacio, su token pierde ese espacio al instante. */
    it('loses a space the moment its owner loses it', async () => {
      const secret = await tokenFor(worker, {
        allSpaces: [],
        spaces: [{ permissions: [read], spaceId: spaces.restricted }],
      });
      const prisma = testApp.get(PrismaService);

      expect((await call(secret, 'read_page', { pageId: pages.restricted })).isError).not.toBe(true);
      await prisma.spaceMember.deleteMany({ where: { spaceId: spaces.restricted, userId: worker.id } });
      const afterRemoval = await call(secret, 'read_page', { pageId: pages.restricted });
      await prisma.spaceMember.create({ data: { spaceId: spaces.restricted, userId: worker.id } });

      expect(afterRemoval.isError).toBe(true);
    });

    it('stops working the moment it is revoked', async () => {
      const created = (await askForToken(worker, { allSpaces: [read], spaces: [] }).expect(201)).body as {
        secret: string;
        token: { id: string };
      };

      await request(testApp.getServer())
        .delete(`${TOKENS_PATH}/${created.token.id}`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(200);

      await request(testApp.getServer())
        .post(MCP_PATH)
        .set('Authorization', `Bearer ${created.secret}`)
        .send({})
        .expect(401);
    });

    /** Solo su dueño cambia lo que tiene dado: para cualquier otra persona, ese token no existe. */
    it('cannot be changed by anyone but its owner', async () => {
      const created = (await askForToken(worker, { allSpaces: [read], spaces: [] }).expect(201)).body as {
        token: { id: string };
      };

      await request(testApp.getServer())
        .patch(`${TOKENS_PATH}/${created.token.id}/access`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ access: { allSpaces: [read, ACCESS_TOKEN_PERMISSIONS.pagesWrite], spaces: [] } })
        .expect(404);
    });
  });

  describe('qué herramientas se le ofrecen al agente', () => {
    it('offers only the tools the token can use somewhere', async () => {
      const secret = await tokenFor(worker, {
        allSpaces: [],
        spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsRead], spaceId: spaces.open }],
      });
      const client = await connect(secret);

      const tools = await client.listTools();
      await client.close();

      expect(tools.tools.map((tool) => tool.name)).toEqual(['list_spaces']);
    });
  });

  describe('lo que ve quien administra', () => {
    /**
     * El administrador ve todos los tokens, pero los espacios que no ve no los
     * lee ni en la lista de tokens: el privado de otra persona aparece como un
     * número, sin nombre.
     */
    it('sees every token and counts, without naming, a private space it cannot see', async () => {
      const created = (
        await askForToken(worker, {
          allSpaces: [],
          spaces: [
            { permissions: [read], spaceId: spaces.open },
            { permissions: [read], spaceId: spaces.workerPrivate },
          ],
        }).expect(201)
      ).body as { token: { id: string } };

      const listed = await request(testApp.getServer())
        .get(`${TOKENS_PATH}/workspace`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      const seen = (
        listed.body as { hiddenSpaceCount: number; id: string; owner: { id: string }; spaces: { spaceId: string }[] }[]
      ).find((token) => token.id === created.token.id);

      expect(seen?.owner.id).toBe(worker.id);
      expect(seen?.spaces.map((grant) => grant.spaceId)).toEqual([spaces.open]);
      expect(seen?.hiddenSpaceCount).toBe(1);
      expect(JSON.stringify(listed.body)).not.toContain(spaces.workerPrivate);
    });

    it('is refused to anyone who does not run the workspace', async () => {
      await request(testApp.getServer())
        .get(`${TOKENS_PATH}/workspace`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(403);
    });
  });
});
