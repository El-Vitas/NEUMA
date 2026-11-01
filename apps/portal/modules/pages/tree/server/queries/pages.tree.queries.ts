import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_TREE_API_ROUTES, PAGE_TREE_WINDOW_SIZE } from '../../constants/pages.tree.constants';
import { pageRecentSchema, pageTreeAncestorsSchema, pageTreePathSchema } from '../../schemas/pages.tree.schemas';
import type { PageRecentEntry, PageTreeAncestor, PageTreeChildren, PageTreePath } from '../../types/pages.tree.types';
import { readTreeWindow } from '../lib/pages.tree.server';

/** The top of a space for the sidebar; the cache is dropped with the pages of the space (ADR 030). */
export const getTreeRoots = async (spaceId: string): Promise<Result<PageTreeChildren, Error>> =>
  withQuery({ op: 'getTreeRoots', params: { spaceId } }, (accessToken) => getTreeRootsCached(accessToken, spaceId));

const getTreeRootsCached = async (accessToken: string, spaceId: string): Promise<PageTreeChildren> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  return readTreeWindow(accessToken, spaceId, { parentId: null, skip: 0, take: PAGE_TREE_WINDOW_SIZE });
};

const readNothingWhenMissing = async <T>(read: () => Promise<T>): Promise<T | null> => {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
};

const readPathFresh = cache(
  async (accessToken: string, spaceId: string, pageId: string): Promise<PageTreePath | null> =>
    readNothingWhenMissing(async () =>
      pageTreePathSchema.parse(await apiRequest<unknown>(PAGE_TREE_API_ROUTES.path(spaceId, pageId), accessToken)),
    ),
);

/** Where a page sits and the windows of the sidebar that show it; null when the reader cannot open the page. */
export const getPagePath = async (spaceId: string, pageId: string): Promise<Result<PageTreePath | null, Error>> =>
  withQuery({ op: 'getPagePath', params: { pageId, spaceId } }, (accessToken) =>
    readPathFresh(accessToken, spaceId, pageId),
  );

const readAncestorsFresh = cache(
  async (accessToken: string, spaceId: string, pageId: string): Promise<readonly PageTreeAncestor[] | null> =>
    readNothingWhenMissing(async () => {
      const response = await apiRequest<unknown>(PAGE_TREE_API_ROUTES.ancestors(spaceId, pageId), accessToken);
      return pageTreeAncestorsSchema.parse(response).ancestors;
    }),
);

export const getPageAncestors = async (
  spaceId: string,
  pageId: string,
): Promise<Result<readonly PageTreeAncestor[] | null, Error>> =>
  withQuery({ op: 'getPageAncestors', params: { pageId, spaceId } }, (accessToken) =>
    readAncestorsFresh(accessToken, spaceId, pageId),
  );

export const getRecentPages = async (
  spaceId: string,
  take: number,
): Promise<Result<readonly PageRecentEntry[], Error>> =>
  withQuery({ op: 'getRecentPages', params: { spaceId, take } }, (accessToken) =>
    getRecentPagesCached(accessToken, spaceId, take),
  );

const getRecentPagesCached = async (
  accessToken: string,
  spaceId: string,
  take: number,
): Promise<readonly PageRecentEntry[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_TREE_API_ROUTES.recent(spaceId, take), accessToken);
  return pageRecentSchema.parse(response).entries;
};
