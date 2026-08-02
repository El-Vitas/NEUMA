import type { PageParentReference } from './page.domain.types';

export const isPageMoveAllowed = (
  pageId: string,
  parentId: null | string,
  pages: readonly PageParentReference[],
): boolean => {
  if (!hasValidPageParent(pageId, parentId, pages)) {
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

export const hasValidPageParent = (
  pageId: string,
  parentId: null | string,
  pages: readonly PageParentReference[],
): boolean => {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return false;
  if (parentId === null) return true;
  const parent = pages.find((candidate) => candidate.id === parentId);
  return parent !== undefined && parent.spaceId === page.spaceId && parent.id !== page.id;
};
