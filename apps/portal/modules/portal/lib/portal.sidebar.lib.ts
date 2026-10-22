import { PAGE_LIFECYCLE, type SpaceVisibility } from '@neuma/shared';
import type { KeyboardEvent } from 'react';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import { PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE } from '../constants/portal.sidebar.drag.constants';
import {
  SIDEBAR_PAGE_TREE_ITEM_SELECTOR,
  SIDEBAR_PAGE_TREE_LINK_SELECTOR,
  SIDEBAR_PAGE_TREE_SELECTOR,
  SIDEBAR_PAGE_TREE_TOGGLE_SELECTOR,
  SIDEBAR_TREE_INDENT_BASE_PX,
  SIDEBAR_TREE_INDENT_STEP_PX,
  SIDEBAR_TREE_MAX_INDENTED_DEPTH,
} from '../constants/sidebar.constants';
import type { PortalSidebarPageKeyboardMove } from '../types/portal.sidebar.drag.types';
import type { PortalSidebarPage, PortalSidebarPageTreeItem, PortalSpaceKind } from '../types/portal.types';

/** An owned private space and one shared with the viewer look identical in the data; `ownerId` tells them apart. */
export const resolvePortalSpaceKind = (
  visibility: SpaceVisibility,
  ownerId: null | string,
  currentUserId: string,
): PortalSpaceKind => {
  if (visibility !== 'PRIVATE') return 'own';
  return ownerId === currentUserId ? 'private' : 'shared';
};

/** Trashed pages are reachable from `/trash`, so the tree shows only active ones, and the page that is open. */
export const getVisiblePortalSidebarPages = (
  pages: readonly PortalSidebarPage[],
  openPageId: string | null = null,
): readonly PortalSidebarPage[] =>
  pages.filter((page) => page.lifecycle === PAGE_LIFECYCLE.ACTIVE || page.id === openPageId);

export const buildPortalSidebarPageTree = (
  pages: readonly PortalSidebarPage[],
  openPageId: string | null = null,
): readonly PortalSidebarPageTreeItem[] =>
  buildTree(getVisiblePortalSidebarPages(pages, openPageId), (page, children) => ({ children, page }));

export const getPortalSidebarExpandedPageIds = (
  tree: readonly PortalSidebarPageTreeItem[],
  selectedPageId: string | null,
): readonly string[] =>
  getTreeExpandedIds(
    tree,
    selectedPageId,
    (treeItem) => treeItem.page.id,
    (treeItem) => treeItem.children,
  );

/** The chevron shows from the flag the backend sent, before any child is loaded (ADR 030). */
export const hasPortalSidebarPageChildren = (page: PortalSidebarPage, loadedChildCount: number): boolean =>
  page.hasChildren === true || loadedChildCount > 0;

/** The end of the loaded children offers the next window, or says they are on their way when none has arrived. */
export const shouldOfferPortalSidebarNextWindow = (
  hasNext: boolean,
  loadedChildCount: number,
  isLoading: boolean,
): boolean => hasNext || (loadedChildCount === 0 && isLoading);

/** Opening a page whose children were never read asks for them; one already read just opens. */
export const shouldLoadPortalSidebarChildren = (
  pages: readonly PortalSidebarPage[],
  expandedPageIds: ReadonlySet<string>,
  pageId: string,
): boolean => !expandedPageIds.has(pageId) && !pages.some((page) => page.parentId === pageId);

export const getPortalSidebarSelectedPageId = (
  pathname: string,
  pages: readonly PortalSidebarPage[],
  spacePath: string,
): string | null => {
  const selectedPage = pages.find((page) => pathname === `${spacePath}/pages/${page.id}`);
  return selectedPage?.id ?? null;
};

const getSidebarPageTreeLinks = (treeElement: HTMLElement): HTMLAnchorElement[] =>
  Array.from(treeElement.querySelectorAll<HTMLAnchorElement>(SIDEBAR_PAGE_TREE_LINK_SELECTOR));

const getSidebarPageTreeItemElement = (pageLink: HTMLAnchorElement): HTMLElement | null =>
  pageLink.closest<HTMLElement>(SIDEBAR_PAGE_TREE_ITEM_SELECTOR);

const getSidebarPageTreeToggleElement = (treeItem: HTMLElement): HTMLButtonElement | null =>
  treeItem.querySelector<HTMLButtonElement>(SIDEBAR_PAGE_TREE_TOGGLE_SELECTOR);

const getFirstChildSidebarPageTreeLink = (treeItem: HTMLElement): HTMLAnchorElement | null => {
  const childList = Array.from(treeItem.children).find((child) => child instanceof HTMLUListElement);

  return childList?.querySelector<HTMLAnchorElement>(SIDEBAR_PAGE_TREE_LINK_SELECTOR) ?? null;
};

const getParentSidebarPageTreeItemElement = (treeItem: HTMLElement): HTMLElement | null => {
  const parentList = treeItem.parentElement;
  const parentTreeItem = parentList?.parentElement;

  return parentTreeItem instanceof HTMLElement && parentTreeItem.matches(SIDEBAR_PAGE_TREE_ITEM_SELECTOR)
    ? parentTreeItem
    : null;
};

const focusAdjacentSidebarPageTreeLink = (
  pageLinks: readonly HTMLAnchorElement[],
  pageLink: HTMLAnchorElement,
  offset: number,
): void => {
  const pageLinkIndex = pageLinks.indexOf(pageLink);
  pageLinks.at(pageLinkIndex + offset)?.focus();
};

const navigateSidebarPageTreeRight = (pageLink: HTMLAnchorElement): void => {
  const treeItem = getSidebarPageTreeItemElement(pageLink);
  const toggle = treeItem === null ? null : getSidebarPageTreeToggleElement(treeItem);
  if (treeItem === null || toggle === null) return;

  if (toggle.getAttribute('aria-expanded') === 'false') {
    toggle.click();
    return;
  }
  getFirstChildSidebarPageTreeLink(treeItem)?.focus();
};

const navigateSidebarPageTreeLeft = (pageLink: HTMLAnchorElement): void => {
  const treeItem = getSidebarPageTreeItemElement(pageLink);
  if (treeItem === null) return;

  const toggle = getSidebarPageTreeToggleElement(treeItem);
  if (toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.click();
    return;
  }

  getParentSidebarPageTreeItemElement(treeItem)
    ?.querySelector<HTMLAnchorElement>(SIDEBAR_PAGE_TREE_LINK_SELECTOR)
    ?.focus();
};

const isSidebarPageTreeNavigationKey = (key: string): boolean =>
  ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key);

/** Attached to each link rather than the list: the list is a plain container and is not focusable. */
export const handleSidebarPageTreeKeyDown = (event: KeyboardEvent<HTMLAnchorElement>): void => {
  const pageLink = event.currentTarget;
  const tree = pageLink.closest<HTMLUListElement>(SIDEBAR_PAGE_TREE_SELECTOR);
  if (tree === null || !isSidebarPageTreeNavigationKey(event.key)) return;

  const pageLinks = getSidebarPageTreeLinks(tree);
  event.preventDefault();

  switch (event.key) {
    case 'ArrowDown':
      focusAdjacentSidebarPageTreeLink(pageLinks, pageLink, 1);
      return;
    case 'ArrowUp':
      focusAdjacentSidebarPageTreeLink(pageLinks, pageLink, -1);
      return;
    case 'Home':
      pageLinks.at(0)?.focus();
      return;
    case 'End':
      pageLinks.at(-1)?.focus();
      return;
    case 'ArrowRight':
      navigateSidebarPageTreeRight(pageLink);
      return;
    case 'ArrowLeft':
      navigateSidebarPageTreeLeft(pageLink);
      return;
    default:
      return;
  }
};

/** Uses Alt so plain arrow keys keep moving focus. */
export const isPortalSidebarPageMoveShortcut = (
  event: Pick<KeyboardEvent<HTMLAnchorElement>, 'altKey' | 'key'>,
): PortalSidebarPageKeyboardMove | null => {
  if (!event.altKey) return null;
  if (event.key === 'ArrowRight') return PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE.Indent;
  if (event.key === 'ArrowLeft') return PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE.Outdent;
  return null;
};

export const buildSidebarTreeIndent = (depth: number): number =>
  Math.min(depth, SIDEBAR_TREE_MAX_INDENTED_DEPTH) * SIDEBAR_TREE_INDENT_STEP_PX + SIDEBAR_TREE_INDENT_BASE_PX;
