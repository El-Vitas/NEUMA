import { type PageContent, pageContentSchema, Result } from '@company-brain/shared';
import type { PageParentReference } from './page.domain.types';
import { PageContentValidationError } from './page.error';

export const validatePageContent = (content: unknown): Result<PageContent, PageContentValidationError> => {
  const validation = pageContentSchema.safeParse(content);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new PageContentValidationError(validation.error.issues));
};

export const isPageMoveAllowed = (
  pageId: string,
  parentId: null | string,
  targetSpaceId: string,
  pages: readonly PageParentReference[],
): boolean => {
  if (!hasValidPageParent(pageId, parentId, targetSpaceId, pages)) {
    return false;
  }

  const parentById = new Map(pages.map((page) => [page.id, page.parentId]));
  let currentId: null | string = parentId;
  while (currentId !== null) {
    if (currentId === pageId) {
      return false;
    }
    currentId = parentById.get(currentId) ?? null;
  }
  return true;
};

/**
 * Whether a page may hang from `parentId` once it lands in `targetSpaceId`.
 *
 * The parent is judged against the space the page is going to, not the one it
 * comes from: a page moved across spaces travels with its children, so what has
 * to hold is that it ends up beneath something already living where it lands.
 */
export const hasValidPageParent = (
  pageId: string,
  parentId: null | string,
  targetSpaceId: string,
  pages: readonly PageParentReference[],
): boolean => {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return false;
  if (parentId === null) return true;
  const parent = pages.find((candidate) => candidate.id === parentId);
  return parent?.spaceId === targetSpaceId && parent.id !== page.id;
};

/**
 * Every page nested under `pageId`, at any depth, so a trash or restore
 * action can carry the whole branch with it instead of only the one page.
 *
 * A breadth-first walk over a parent-to-children map, since the hierarchy
 * arrives flat and recursion would need the same map rebuilt on every call.
 */
export const collectDescendantIds = (pageId: string, pages: readonly PageParentReference[]): readonly string[] => {
  const childIdsByParentId = new Map<string, string[]>();
  for (const page of pages) {
    if (page.parentId === null) continue;
    const siblingIds = childIdsByParentId.get(page.parentId) ?? [];
    siblingIds.push(page.id);
    childIdsByParentId.set(page.parentId, siblingIds);
  }

  const descendantIds: string[] = [];
  const queue = [...(childIdsByParentId.get(pageId) ?? [])];
  let cursor = 0;
  while (cursor < queue.length) {
    const currentId = queue[cursor];
    cursor += 1;
    if (currentId === undefined) continue;
    descendantIds.push(currentId);
    queue.push(...(childIdsByParentId.get(currentId) ?? []));
  }
  return descendantIds;
};

export const pageTitleMatchesSearch = (title: string, search: null | string): boolean => {
  const trimmedSearch = search?.trim().toLowerCase() ?? '';
  return trimmedSearch.length === 0 || title.toLowerCase().includes(trimmedSearch);
};

/**
 * Whether a page names somebody among the people it is assigned to.
 *
 * Only properties the schema calls a person are read: a page that happens to
 * mention an identifier in some text is not a page somebody was given.
 */
export const isPageAssignedTo = (
  propertyValues: Record<string, unknown> | null,
  personPropertyKeys: readonly string[],
  userId: string,
): boolean => {
  if (propertyValues === null) return false;
  return personPropertyKeys.some((key) => {
    const value = propertyValues[key];
    if (typeof value === 'string') return value === userId;
    return Array.isArray(value) && value.includes(userId);
  });
};
