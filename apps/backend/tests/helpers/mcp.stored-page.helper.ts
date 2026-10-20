import { PageLifecycle } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import type { TestApp } from './test-app.helper';

const HTTP_OK = 200;

export interface StoredPage {
  readonly content: unknown;
  readonly icon?: unknown;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly lockedAt: null | string;
  readonly parentId: null | string;
  readonly propertyValues: Record<string, unknown> | null;
  readonly spaceId: string;
  readonly title: string;
  readonly verifiedAt: null | string;
  readonly version: number;
}

interface PageBlockLocation {
  readonly spaceId: string;
}

const findPageSpace = async (testApp: TestApp, pageId: string): Promise<PageBlockLocation> => {
  const block = await testApp.get(PrismaService).models.Block.select('spaceId').where({ id: pageId }).first();
  if (block === null) throw new Error(`Expected the page block ${pageId} to exist`);
  return block;
};

/** Reads a page the way a person who can read everything does: from the page service, over its own endpoint. */
export const readStoredPage = async (testApp: TestApp, readerToken: string, pageId: string): Promise<StoredPage> => {
  const { spaceId } = await findPageSpace(testApp, pageId);
  const response = await request(testApp.getServer())
    .get(`/api/v1/spaces/${spaceId}/pages/${pageId}`)
    .set('Authorization', `Bearer ${readerToken}`)
    .expect(HTTP_OK);
  return response.body as StoredPage;
};

export const readStoredContent = async (testApp: TestApp, readerToken: string, pageId: string): Promise<string> =>
  JSON.stringify((await readStoredPage(testApp, readerToken, pageId)).content);

/** Pages directly under a parent, trashed ones included. */
export const countChildPages = async (testApp: TestApp, parentId: string): Promise<number> =>
  (
    await testApp
      .get(PrismaService)
      .models.Block.where({ parentId, type: 'page' })
      .aggregate((aggregation) => ({ total: aggregation.count() }))
  ).total;

/** Ids of the pages in a space that carry exactly this title and are not in the trash. */
export const listActivePageIdsTitled = async (
  testApp: TestApp,
  spaceId: string,
  title: string,
): Promise<readonly string[]> => {
  const pages = await testApp
    .get(PrismaService)
    .models.Block.select('id', 'properties')
    .where({ lifecycle: PageLifecycle.ACTIVE, spaceId, type: 'page' })
    .all();
  const wanted = JSON.stringify([{ insert: title }]);
  return pages.filter((page) => JSON.stringify(readTitle(page.properties)) === wanted).map((page) => page.id);
};

const readTitle = (properties: unknown): unknown =>
  typeof properties === 'object' && properties !== null && 'title' in properties ? properties.title : null;

export const countSpacePages = async (testApp: TestApp, spaceId: string): Promise<number> =>
  (
    await testApp
      .get(PrismaService)
      .models.Block.where({ spaceId, type: 'page' })
      .aggregate((aggregation) => ({ total: aggregation.count() }))
  ).total;
