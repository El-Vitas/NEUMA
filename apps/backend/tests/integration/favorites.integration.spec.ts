import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface FavoriteResponse {
  favoriteId: string;
  lifecycle: string;
  pageId: string;
  spaceId: string;
  title: string;
}

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_FORBIDDEN = 403;

describe('Favorites (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let reader: SeededUser;
  let spaceId: string;
  let secretSpaceId: string;

  const createPage = async (
    title: string,
    overrides: {
      lifecycle?: 'ACTIVE' | 'TRASHED';
      parentId?: string;
      permissions?: ReturnType<typeof onlyUserPermissions>;
      spaceId?: string;
    } = {},
  ): Promise<string> => {
    const page = await createBlockFactory(prisma.models).create({
      createdById: admin.id,
      editedById: admin.id,
      spaceId,
      title,
      type: 'page',
      ...overrides,
    });
    return page.id;
  };

  const addFavorite = (token: string, pageId: string) =>
    request(testApp.getServer()).post(`/api/v1/favorites/${pageId}`).set('Authorization', `Bearer ${token}`);

  const listFavorites = async (token: string): Promise<FavoriteResponse[]> =>
    (
      await request(testApp.getServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(HTTP_OK)
    ).body as FavoriteResponse[];

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'favorites-admin', 'ADMIN');
    reader = await createSeededUser(testApp, 'favorites-reader', 'WORKER');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    secretSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.RESTRICTED);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('shows the title and location of a favorite page as they are in its block', async () => {
    const pageId = await createPage('Favorite Title');

    await addFavorite(reader.token, pageId).expect(HTTP_CREATED);

    const favorites = await listFavorites(reader.token);
    expect(favorites.find((favorite) => favorite.pageId === pageId)).toMatchObject({
      lifecycle: 'ACTIVE',
      pageId,
      spaceId,
      title: 'Favorite Title',
    });
  });

  it('refuses to favorite a page the reader cannot read or that is in the trash', async () => {
    const hiddenPageId = await createPage('Hidden To Favorite', { permissions: onlyUserPermissions(admin.id) });
    const secretPageId = await createPage('Secret To Favorite', { spaceId: secretSpaceId });
    const trashedPageId = await createPage('Trashed To Favorite', { lifecycle: 'TRASHED' });

    await addFavorite(reader.token, hiddenPageId).expect(HTTP_FORBIDDEN);
    await addFavorite(reader.token, secretPageId).expect(HTTP_FORBIDDEN);
    await addFavorite(reader.token, trashedPageId).expect(HTTP_FORBIDDEN);
  });

  it('drops a favorite once its page is trashed and brings it back when restored', async () => {
    const pageId = await createPage('Favorite Then Trashed');
    await addFavorite(reader.token, pageId).expect(HTTP_CREATED);

    await prisma.models.Block.where({ id: pageId }).update({ lifecycle: 'TRASHED' });
    expect((await listFavorites(reader.token)).map((favorite) => favorite.pageId)).not.toContain(pageId);

    await prisma.models.Block.where({ id: pageId }).update({ lifecycle: 'ACTIVE' });
    expect((await listFavorites(reader.token)).map((favorite) => favorite.pageId)).toContain(pageId);
  });

  it('drops a favorite once its page becomes hidden to the reader, and when an ancestor does', async () => {
    const pageId = await createPage('Favorite Then Hidden');
    const nestedPageId = await createPage('Favorite Nested', { parentId: pageId });
    await addFavorite(reader.token, pageId).expect(HTTP_CREATED);
    await addFavorite(reader.token, nestedPageId).expect(HTTP_CREATED);

    await prisma.models.Block.where({ id: pageId }).update({ permissions: onlyUserPermissions(admin.id) });

    const favoritedIds = (await listFavorites(reader.token)).map((favorite) => favorite.pageId);
    expect(favoritedIds).not.toContain(pageId);
    expect(favoritedIds).not.toContain(nestedPageId);
  });
});
