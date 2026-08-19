import { extractPageContentSegments, joinPageContentSegmentsForDisplay } from '@company-brain/shared';
import { BRAND_NAME } from '@/shared/constants/brand.constants';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import type { PageContent, PageLifecycle, PageSummary, PageTreeItem } from '../types/pages.types';

export const canEditPage = (canEditRole: boolean, lifecycle: PageLifecycle | null): boolean =>
  canEditRole && lifecycle !== 'TRASHED';

export const buildPageTree = (pages: readonly PageSummary[]): readonly PageTreeItem[] =>
  buildTree(pages, (page, children) => ({ children, page }));

/**
 * What the browser tab says of a page: its own name first, the workspace after.
 *
 * The page comes first because a row of tabs is read by its first word, and the
 * word that tells them apart is the page's, not the one they all share.
 */
export const buildPageDocumentTitle = (title: string, untitledLabel: string): string => {
  const writtenTitle = title.trim();
  return `${writtenTitle.length > 0 ? writtenTitle : untitledLabel} · ${BRAND_NAME}`;
};

/**
 * Why a page cannot be written in, said in its own words.
 *
 * The trash and a lock are different situations with different ways out, and a
 * single "read only" would leave whoever reads it looking for the wrong one.
 */
export const resolveReadOnlyMessage = (
  lifecycle: PageLifecycle,
  isLocked: boolean,
  say: (key: string) => string,
): string => {
  if (lifecycle === 'TRASHED') return say('trashReadOnly');
  return isLocked ? say('lock.banner') : say('readOnly');
};

export const extractPageText = (content: PageContent): string =>
  joinPageContentSegmentsForDisplay(extractPageContentSegments(content));

export const getPageTreeExpandedIds = (
  tree: readonly PageTreeItem[],
  selectedPageId: string | null,
): readonly string[] =>
  getTreeExpandedIds(
    tree,
    selectedPageId,
    (treeItem) => treeItem.page.id,
    (treeItem) => treeItem.children,
  );
