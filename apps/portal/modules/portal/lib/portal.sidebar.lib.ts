import type { KeyboardEvent } from 'react';
import type { PortalSidebarPage, PortalSidebarPageTreeItem } from '../types/portal.types';

export const buildPortalSidebarPageTree = (
  pages: readonly PortalSidebarPage[],
): readonly PortalSidebarPageTreeItem[] => {
  const childrenByParent = new Map<string | null, PortalSidebarPage[]>();
  for (const page of pages) {
    const siblings = childrenByParent.get(page.parentId) ?? [];
    siblings.push(page);
    childrenByParent.set(page.parentId, siblings);
  }

  const buildChildren = (parentId: string | null): readonly PortalSidebarPageTreeItem[] =>
    (childrenByParent.get(parentId) ?? [])
      .toSorted((left, right) => left.order - right.order)
      .map((page) => ({ children: buildChildren(page.id), page }));

  return buildChildren(null);
};

export const getPortalSidebarExpandedPageIds = (
  tree: readonly PortalSidebarPageTreeItem[],
  selectedPageId: string | null,
): readonly string[] => {
  if (selectedPageId === null) return [];
  for (const treeItem of tree) {
    if (treeItem.page.id === selectedPageId) return [treeItem.page.id];
    const childPath = getPortalSidebarExpandedPageIds(treeItem.children, selectedPageId);
    if (childPath.length > 0) return [treeItem.page.id, ...childPath];
  }
  return [];
};

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

export const handleSidebarPageTreeKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
  const pageLink =
    event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(sidebarPageTreeLinkSelector) : null;
  if (pageLink === null || !event.currentTarget.contains(pageLink)) return;
  if (!isSidebarPageTreeNavigationKey(event.key)) return;

  const pageLinks = getSidebarPageTreeLinks(event.currentTarget);
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
