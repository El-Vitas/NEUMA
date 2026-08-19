import { PAGE_LIFECYCLE } from '@company-brain/shared';
import type { KeyboardEvent } from 'react';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import { PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE } from '../constants/portal.sidebar.drag.constants';
import type { PortalSidebarPageKeyboardMove } from '../types/portal.sidebar.drag.types';
import type { PortalSidebarPage, PortalSidebarPageTreeItem } from '../types/portal.types';

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

const sidebarPageTreeItemSelector = '[data-page-tree-item="true"]';
const sidebarPageTreeLinkSelector = '[data-page-tree-link="true"]';

/** The list the pages of a space hang from, which is where moving between them makes sense. */
const sidebarPageTreeSelector = '[data-page-tree="true"]';
const sidebarPageTreeToggleSelector = '[data-page-tree-toggle="true"]';

const getSidebarPageTreeLinks = (treeElement: HTMLElement): HTMLAnchorElement[] =>
  Array.from(treeElement.querySelectorAll<HTMLAnchorElement>(sidebarPageTreeLinkSelector));

const getSidebarPageTreeItemElement = (pageLink: HTMLAnchorElement): HTMLElement | null =>
  pageLink.closest<HTMLElement>(sidebarPageTreeItemSelector);

const getSidebarPageTreeToggleElement = (treeItem: HTMLElement): HTMLButtonElement | null =>
  treeItem.querySelector<HTMLButtonElement>(sidebarPageTreeToggleSelector);

const getFirstChildSidebarPageTreeLink = (treeItem: HTMLElement): HTMLAnchorElement | null => {
  const childList = Array.from(treeItem.children).find((child) => child instanceof HTMLUListElement);

  return childList?.querySelector<HTMLAnchorElement>(sidebarPageTreeLinkSelector) ?? null;
};

const getParentSidebarPageTreeItemElement = (treeItem: HTMLElement): HTMLElement | null => {
  const parentList = treeItem.parentElement;
  const parentTreeItem = parentList?.parentElement;

  return parentTreeItem instanceof HTMLElement && parentTreeItem.matches(sidebarPageTreeItemSelector)
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

  getParentSidebarPageTreeItemElement(treeItem)?.querySelector<HTMLAnchorElement>(sidebarPageTreeLinkSelector)?.focus();
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
  const tree = pageLink.closest<HTMLUListElement>(sidebarPageTreeSelector);
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
