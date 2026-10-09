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

/**
 * What letting go over a row would mean: putting the page inside it, or
 * setting it down beside it.
 *
 * Where in the row the pointer rests is the whole question. The middle is by
 * far the widest part, because nesting is what a drag usually means; the thin
 * edges are what let somebody say «here, between these two» instead.
 */
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

/** True when `descendantId` sits anywhere below `ancestorId` in the tree, itself included. */
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

/** A page cannot land on itself nor inside anything it already contains. */
export const isPortalSidebarPageDropAllowed = (
  pages: readonly PortalSidebarPage[],
  draggedPageId: string,
  targetPageId: string,
): boolean => !isPortalSidebarPageOrDescendant(pages, draggedPageId, targetPageId);

/** The page immediately above this one among its siblings, whose place it would take when indented. */
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

/** Where this page lands when it climbs out of its parent to become that parent's sibling. */
export const resolvePortalSidebarOutdentParentId = (
  pages: readonly PortalSidebarPage[],
  pageId: string,
): null | string | undefined => {
  const page = findPortalSidebarPage(pages, pageId);
  const parentId = page?.parentId ?? null;
  if (parentId === null) return;
  return findPortalSidebarPage(pages, parentId)?.parentId ?? null;
};

/** Shows which element the dragged page would land on, and stops showing it wherever it no longer would. */
export const markPortalSidebarPageDropTarget = (
  element: Element | null,
  intent: PortalSidebarDropIntent = 'nest',
): void => {
  for (const marked of document.querySelectorAll(`[${PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE}]`)) {
    if (marked !== element) marked.removeAttribute(PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE);
  }
  /** The mark says what would happen, not merely that something would: nesting and slotting in look different. */
  element?.setAttribute(PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE, intent);
};

/**
 * What page a drag is carrying, read from what it wrote when it started.
 *
 * Anything that is not a page of this application reads as nothing at all,
 * because a sidebar row should not act on whatever the desktop happened to drop
 * on it.
 */
export const readPortalSidebarDraggedPage = (payload: string): PortalSidebarDraggedPage | null => {
  const parsed = portalSidebarDraggedPageSchema.safeParse(readJson(payload));
  return parsed.success ? parsed.data : null;
};

/** What space a drag is carrying, if it is carrying one at all. */
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
