import { type PageContent, pageContentSchema, Result } from '@neuma/shared';
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

/** The parent is judged against the destination space, since a moved page travels with its children. */
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

/** Breadth-first over a parent-to-children map: the hierarchy arrives flat, and recursion would rebuild the map. */
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

/** Only person-typed properties count, not identifiers mentioned in text. */
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
