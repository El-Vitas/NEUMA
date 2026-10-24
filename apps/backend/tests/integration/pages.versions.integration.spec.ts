import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE, type PageContent, USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { pageStoredJsonSchema } from '@/modules/pages/schemas/page.block.schemas';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface VersionListResponse {
  items: { author: null | { id: string; name: string }; createdAt: string; title: string; version: number }[];
  nextCursor: null | number;
}

interface ErrorResponse {
  code?: string;
  error?: { code: string };
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const documentSaying = (...paragraphs: readonly (readonly [string, string])[]): PageContent => ({
  content: paragraphs.map(([id, text]) => paragraph(id, text)),
  schemaVersion: 1,
  type: 'doc',
});

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const codeOf = (body: unknown): string | undefined => {
  const response = body as ErrorResponse;
  return response.error?.code ?? response.code;
};

describe('Page version history (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let workerToken: string;
  let adminId: string;
  let workspaceId: string;
  let spaceId: string;
  let otherSpaceId: string;

  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}`, 'x-mutation-id': crypto.randomUUID() });
  const asWorker = () => ({ Authorization: `Bearer ${workerToken}`, 'x-mutation-id': crypto.randomUUID() });
  const pagePath = (pageId: string, space = spaceId): string => `/api/v1/spaces/${space}/pages/${pageId}`;
  const versionsPath = (pageId: string, space = spaceId): string => `${pagePath(pageId, space)}/versions`;

  const createPage = async (title: string, content: PageContent): Promise<IdResponse> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(asAdmin())
      .send({ content, title })
      .expect(HTTP_CREATED);
    return response.body as IdResponse;
  };

  const rewriteContent = (pageId: string, content: PageContent) =>
    request(testApp.getServer())
      .put(`${pagePath(pageId)}/content`)
      .set(asAdmin())
      .send({ content })
      .expect(HTTP_OK);

  const closeStretch = async (pageId: string): Promise<void> => {
    await prisma.models.PageVersion.where({ pageId }).updateAndCount({
      createdAt: new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS),
    });
  };

  const createPageEditedInTwoStretches = async (title: string) => {
    const block = crypto.randomUUID();
    const page = await createPage(title, documentSaying([block, 'Primero']));
    await closeStretch(page.id);
    await rewriteContent(page.id, documentSaying([block, 'Segundo']));
    return { block, page };
  };

  const insertVersions = async (pageId: string, first: number, last: number): Promise<void> => {
    for (let version = first; version <= last; version += 1) {
      await prisma.models.PageVersion.create({
        content: pageStoredJsonSchema.parse(documentSaying([crypto.randomUUID(), `Versión ${String(version)}`])),
        createdById: adminId,
        pageId,
        title: `Título ${String(version)}`,
        version,
      });
    }
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const timestamp = String(Date.now());
    const adminEmail = `pages-versions-admin-${timestamp}@test.com`;
    const workerEmail = `pages-versions-worker-${timestamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Versions Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Versions Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: USER_ROLE.ADMIN });
    await prisma.models.User.where({ email: workerEmail }).update({ role: USER_ROLE.WORKER });
    adminToken = (await loginUser(testApp, adminEmail, PASSWORD)).accessToken;
    workerToken = (await loginUser(testApp, workerEmail, PASSWORD)).accessToken;
    const workerId = required(await prisma.models.User.where({ email: workerEmail }).first(), 'the worker').id;
    adminId = required(await prisma.models.User.where({ email: adminEmail }).first(), 'the admin').id;
    const createSpace = async (name: string): Promise<string> => {
      const response = await request(testApp.getServer())
        .post('/api/v1/spaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, slug: `${name}-${timestamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
        .expect(HTTP_CREATED);
      return (response.body as IdResponse).id;
    };
    spaceId = await createSpace('pages-versions');
    otherSpaceId = await createSpace('pages-versions-other');
    workspaceId = required(await prisma.models.Space.where({ id: spaceId }).first(), 'the space').workspaceId;
    await prisma.models.WorkspaceMember.createAndCount([{ role: USER_ROLE.WORKER, userId: workerId, workspaceId }], {
      onConflict: 'skip',
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('listing the versions of a page', () => {
    it('lists the newest first with the author and the date, and never the content', async () => {
      const { page } = await createPageEditedInTwoStretches('Dos tramos');

      const response = await request(testApp.getServer()).get(versionsPath(page.id)).set(asAdmin()).expect(HTTP_OK);

      const listing = response.body as VersionListResponse;
      expect(listing.items.map((entry) => entry.version)).toEqual([2, 1]);
      expect(listing.items[0]).toMatchObject({ author: { id: adminId, name: 'Versions Admin' }, title: 'Dos tramos' });
      expect(Number.isNaN(Date.parse(listing.items[0]?.createdAt ?? ''))).toBe(false);
      expect(listing.nextCursor).toBeNull();
      expect(JSON.stringify(listing)).not.toContain('Primero');
    });

    it('pages with a cursor and refuses a page size beyond the bound', async () => {
      const page = await createPage('Muchas versiones', documentSaying([crypto.randomUUID(), 'Base']));
      await insertVersions(page.id, 2, 5);

      const first = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}?limit=2`)
        .set(asAdmin())
        .expect(HTTP_OK);
      const firstPage = first.body as VersionListResponse;
      const second = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}?limit=2&cursor=${String(firstPage.nextCursor)}`)
        .set(asAdmin())
        .expect(HTTP_OK);
      const secondPage = second.body as VersionListResponse;
      const last = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}?limit=2&cursor=${String(secondPage.nextCursor)}`)
        .set(asAdmin())
        .expect(HTTP_OK);
      const lastPage = last.body as VersionListResponse;

      expect(firstPage.items.map((entry) => entry.version)).toEqual([5, 4]);
      expect(firstPage.nextCursor).toBe(4);
      expect(secondPage.items.map((entry) => entry.version)).toEqual([3, 2]);
      expect(lastPage.items.map((entry) => entry.version)).toEqual([1]);
      expect(lastPage.nextCursor).toBeNull();
      await request(testApp.getServer())
        .get(`${versionsPath(page.id)}?limit=1000`)
        .set(asAdmin())
        .expect(HTTP_BAD_REQUEST);
    });

    it('answers a page of another space or one the reader cannot reach as forbidden', async () => {
      const { page } = await createPageEditedInTwoStretches('Cerrada al historial');
      await prisma.models.Block.where({ id: page.id }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      });

      await request(testApp.getServer()).get(versionsPath(page.id, otherSpaceId)).set(asAdmin()).expect(HTTP_FORBIDDEN);
      await request(testApp.getServer()).get(versionsPath(page.id)).set(asWorker()).expect(HTTP_FORBIDDEN);
    });

    it('needs a session', async () => {
      const { page } = await createPageEditedInTwoStretches('Sin sesión');

      await request(testApp.getServer()).get(versionsPath(page.id)).expect(401);
    });
  });

  describe('reading one version', () => {
    it('hands back the document the page said then', async () => {
      const { block, page } = await createPageEditedInTwoStretches('Leer versión');

      const response = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}/1`)
        .set(asAdmin())
        .expect(HTTP_OK);

      expect(response.body).toEqual({ content: documentSaying([block, 'Primero']), title: 'Leer versión', version: 1 });
    });

    it('says that a version that is not there is not there', async () => {
      const { page } = await createPageEditedInTwoStretches('Sin esa versión');

      const response = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}/99`)
        .set(asAdmin())
        .expect(HTTP_NOT_FOUND);

      expect(codeOf(response.body)).toBe('PAGE_VERSION_NOT_FOUND');
    });

    it('never shows a block closed to the reader in any version', async () => {
      const shown = crypto.randomUUID();
      const secret = crypto.randomUUID();
      const page = await createPage('Con secreto en el historial', {
        content: [
          paragraph(shown, 'Visible'),
          { attrs: { id: secret }, content: [paragraph(crypto.randomUUID(), 'Texto reservado')], type: 'blockquote' },
        ],
        schemaVersion: 1,
        type: 'doc',
      });
      await closeStretch(page.id);
      await prisma.models.Block.where({ id: secret }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      });
      await rewriteContent(page.id, documentSaying([shown, 'Visible otra vez']));
      expect((await prisma.models.Block.where({ id: secret }).select('alive').first())?.alive).toBe(false);

      const asReader = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}/1`)
        .set(asWorker())
        .expect(HTTP_OK);
      const asOwner = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}/1`)
        .set(asAdmin())
        .expect(HTTP_OK);

      expect(JSON.stringify(asReader.body)).not.toContain('reservado');
      expect(JSON.stringify(asReader.body)).not.toContain(secret);
      expect(JSON.stringify(asReader.body)).toContain('Visible');
      expect(JSON.stringify(asOwner.body)).toContain('reservado');
    });
  });

  describe('a closed block that is still in the page', () => {
    it('is left out of the old version, with the text below it', async () => {
      const shown = crypto.randomUUID();
      const secret = crypto.randomUUID();
      const page = await createPage('Con bloque cerrado', {
        content: [
          paragraph(shown, 'Visible'),
          { attrs: { id: secret }, content: [paragraph(crypto.randomUUID(), 'Texto vigente')], type: 'blockquote' },
        ],
        schemaVersion: 1,
        type: 'doc',
      });
      await prisma.models.Block.where({ id: secret }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      });

      const asReader = await request(testApp.getServer())
        .get(`${versionsPath(page.id)}/1`)
        .set(asWorker())
        .expect(HTTP_OK);

      expect(JSON.stringify(asReader.body)).not.toContain('vigente');
      expect(JSON.stringify(asReader.body)).toContain('Visible');
    });
  });

  describe('restoring a version', () => {
    it('puts the page back as the version said and lets the history go on', async () => {
      const { block, page } = await createPageEditedInTwoStretches('Restaurar');

      const response = await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/1/restore`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      expect(response.body).toMatchObject({ content: documentSaying([block, 'Primero']), id: page.id });
      const read = await request(testApp.getServer()).get(pagePath(page.id)).set(asAdmin()).expect(HTTP_OK);
      expect((read.body as { content: PageContent }).content).toEqual(documentSaying([block, 'Primero']));
    });

    it('keeps what the author had written a minute ago and the restored state as versions of their own', async () => {
      const { block, page } = await createPageEditedInTwoStretches('Sin perder historia');
      await rewriteContent(page.id, documentSaying([block, 'Tercero']));
      await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/1/restore`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const listing = await request(testApp.getServer()).get(versionsPath(page.id)).set(asAdmin()).expect(HTTP_OK);

      const texts = await Promise.all(
        (listing.body as VersionListResponse).items.map(async (entry) => {
          const stored = await prisma.models.PageVersion.where({ pageId: page.id, version: entry.version }).first();
          return JSON.stringify(stored?.content);
        }),
      );
      expect(texts.map((text) => ['Primero', 'Tercero'].find((word) => text.includes(word)))).toEqual([
        'Primero',
        'Tercero',
        'Primero',
      ]);
    });

    it('refuses a locked page with PAGE_LOCKED and leaves it as it was', async () => {
      const { block, page } = await createPageEditedInTwoStretches('Bloqueada');
      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/lock`)
        .set(asAdmin())
        .send({ locked: true })
        .expect(HTTP_OK);

      const response = await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/1/restore`)
        .set(asAdmin())
        .expect(HTTP_CONFLICT);

      expect(codeOf(response.body)).toBe('PAGE_LOCKED');
      const read = await request(testApp.getServer()).get(pagePath(page.id)).set(asAdmin()).expect(HTTP_OK);
      expect((read.body as { content: PageContent }).content).toEqual(documentSaying([block, 'Segundo']));
    });

    it('refuses a page in the trash', async () => {
      const { page } = await createPageEditedInTwoStretches('En la papelera');
      await request(testApp.getServer())
        .post(`${pagePath(page.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const response = await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/1/restore`)
        .set(asAdmin())
        .expect(HTTP_CONFLICT);

      expect(codeOf(response.body)).toBe('PAGE_INVALID_LIFECYCLE');
    });

    it('says that a version that is not there is not there, and refuses a page of another space', async () => {
      const { page } = await createPageEditedInTwoStretches('Restaurar nada');

      await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/99/restore`)
        .set(asAdmin())
        .expect(HTTP_NOT_FOUND);
      await request(testApp.getServer())
        .post(`${versionsPath(page.id, otherSpaceId)}/1/restore`)
        .set(asAdmin())
        .expect(HTTP_FORBIDDEN);
    });

    it('leaves a block closed to the reader alone when the reader restores', async () => {
      const shown = crypto.randomUUID();
      const secret = crypto.randomUUID();
      const page = await createPage('Restaurar con secreto', {
        content: [
          paragraph(shown, 'Visible'),
          { attrs: { id: secret }, content: [paragraph(crypto.randomUUID(), 'Texto reservado')], type: 'blockquote' },
        ],
        schemaVersion: 1,
        type: 'doc',
      });
      await closeStretch(page.id);
      await rewriteContent(page.id, documentSaying([shown, 'Cambiado'], [secret, 'Reservado cambiado']));
      await prisma.models.Block.where({ id: secret }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      });

      await request(testApp.getServer())
        .post(`${versionsPath(page.id)}/1/restore`)
        .set(asWorker())
        .expect(HTTP_CREATED);

      const stored = await prisma.models.Block.where({ id: secret }).select('alive').first();
      expect(stored?.alive).toBe(true);
      const asOwner = await request(testApp.getServer()).get(pagePath(page.id)).set(asAdmin()).expect(HTTP_OK);
      expect(JSON.stringify((asOwner.body as { content: PageContent }).content)).toContain('Reservado cambiado');
    });
  });
});
