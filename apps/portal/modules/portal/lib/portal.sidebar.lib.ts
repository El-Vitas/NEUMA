import { PAGE_LIFECYCLE, type SpaceVisibility } from '@company-brain/shared';
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

/**
 * What a space is to whoever is looking at it.
 *
 * A private space one owns and a private space one was let into look the same
 * from the database and mean opposite things to a reader: the first is their
 * own corner, the second is somebody else's, opened to them.
 */
export const resolvePortalSpaceKind = (
  visibility: SpaceVisibility,
  ownerId: null | string,
  currentUserId: string,
): PortalSpaceKind => {
  if (visibility !== 'PRIVATE') return 'own';
  return ownerId === currentUserId ? 'private' : 'shared';
};

/**
 * A trashed page is reachable from `/trash`, not from the space's own tree,
 * so the tree only ever shows what is still active.
 */
export const getVisiblePortalSidebarPages = (pages: readonly PortalSidebarPage[]): readonly PortalSidebarPage[] =>
  pages.filter((page) => page.lifecycle === PAGE_LIFECYCLE.ACTIVE);

export const buildPortalSidebarPageTree = (pages: readonly PortalSidebarPage[]): readonly PortalSidebarPageTreeItem[] =>
  buildTree(getVisiblePortalSidebarPages(pages), (page, children) => ({ children, page }));

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

/**
 * The arrow keys move between pages of the tree.
 *
 * It is the link that listens, not the list around it: the list is only a
 * container, and a container that answers to the keyboard is a container
 * nobody can reach with one.
 */
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

/**
 * The keyboard alternative to dragging a page: held with the arrow keys that
 * already move focus, so it never steals a shortcut the tree already answers to.
 */
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
