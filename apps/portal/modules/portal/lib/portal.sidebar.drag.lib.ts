import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import {
  PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE,
  PORTAL_SIDEBAR_ROW_NESTING_BAND,
} from '../constants/portal.sidebar.drag.constants';
import {
  portalSidebarDraggedPageSchema,
  portalSidebarDraggedSpaceSchema,
} from '../schemas/portal.sidebar.drag.schemas';
import type { PortalSidebarDraggedPage, PortalSidebarDropIntent } from '../types/portal.sidebar.drag.types';

export const readPortalSidebarDropIntent = (
  row: { readonly height: number; readonly top: number },
  pointerY: number,
): PortalSidebarDropIntent => {
  const edge = (row.height * (1 - PORTAL_SIDEBAR_ROW_NESTING_BAND)) / 2;
  if (pointerY < row.top + edge) return 'before';
  if (pointerY > row.top + row.height - edge) return 'after';
  return 'nest';
};

const findPortalSidebarPage = (pages: readonly PortalSidebarPage[], pageId: string): PortalSidebarPage | undefined =>
  pages.find((page) => page.id === pageId);

const getPortalSidebarSiblings = (
  pages: readonly PortalSidebarPage[],
  parentId: null | string,
): readonly PortalSidebarPage[] =>
  pages.filter((page) => page.parentId === parentId).toSorted((first, second) => first.order - second.order);

/** Includes the page itself: `ancestorId === descendantId` is true. */
export const isPortalSidebarPageOrDescendant = (
  pages: readonly PortalSidebarPage[],
  ancestorId: string,
  descendantId: string,
): boolean => {
  const pageById = new Map(pages.map((page) => [page.id, page]));
  let current: null | string = descendantId;
  while (current !== null) {
    if (current === ancestorId) return true;
    current = pageById.get(current)?.parentId ?? null;
  }
  return false;
};

export const isPortalSidebarPageDropAllowed = (
  pages: readonly PortalSidebarPage[],
  draggedPageId: string,
  targetPageId: string,
): boolean => !isPortalSidebarPageOrDescendant(pages, draggedPageId, targetPageId);

export const resolvePortalSidebarIndentParentId = (
  pages: readonly PortalSidebarPage[],
  pageId: string,
): string | undefined => {
  const page = findPortalSidebarPage(pages, pageId);
  if (page === undefined) return;
  const siblings = getPortalSidebarSiblings(pages, page.parentId);
  const index = siblings.findIndex((sibling) => sibling.id === pageId);
  return index > 0 ? siblings[index - 1]?.id : undefined;
};

export const resolvePortalSidebarOutdentParentId = (
  pages: readonly PortalSidebarPage[],
  pageId: string,
): null | string | undefined => {
  const page = findPortalSidebarPage(pages, pageId);
  const parentId = page?.parentId ?? null;
  if (parentId === null) return;
  return findPortalSidebarPage(pages, parentId)?.parentId ?? null;
};

export const markPortalSidebarPageDropTarget = (
  element: Element | null,
  intent: PortalSidebarDropIntent = 'nest',
): void => {
  for (const marked of document.querySelectorAll(`[${PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE}]`)) {
    if (marked !== element) marked.removeAttribute(PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE);
  }
  element?.setAttribute(PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE, intent);
};

/** Returns null for payloads that are not a page of this app, e.g. files dropped from the desktop. */
export const readPortalSidebarDraggedPage = (payload: string): PortalSidebarDraggedPage | null => {
  const parsed = portalSidebarDraggedPageSchema.safeParse(readJson(payload));
  return parsed.success ? parsed.data : null;
};

export const readPortalSidebarDraggedSpaceId = (payload: string): null | string => {
  const parsed = portalSidebarDraggedSpaceSchema.safeParse(readJson(payload));
  return parsed.success ? parsed.data.spaceId : null;
};

const readJson = (payload: string): unknown => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
