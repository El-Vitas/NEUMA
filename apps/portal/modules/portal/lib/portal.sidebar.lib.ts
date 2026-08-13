import type { KeyboardEvent } from 'react';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import type { PortalSidebarPage, PortalSidebarPageTreeItem } from '../types/portal.types';

export const buildPortalSidebarPageTree = (pages: readonly PortalSidebarPage[]): readonly PortalSidebarPageTreeItem[] =>
  buildTree(pages, (page, children) => ({ children, page }));

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
