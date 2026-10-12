import { extractPageContentSegments, joinPageContentSegmentsForDisplay } from '@neuma/shared';
import { BRAND_NAME } from '@/shared/constants/brand.constants';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import type { PageContent, PageLifecycle, PageSummary, PageTreeItem } from '../types/pages.types';

export const canEditPage = (canEditRole: boolean, lifecycle: PageLifecycle | null): boolean =>
  canEditRole && lifecycle !== 'TRASHED';

export const buildPageTree = (pages: readonly PageSummary[]): readonly PageTreeItem[] =>
  buildTree(pages, (page, children) => ({ children, page }));

/** Page name first: a row of tabs is read by its first word. */
export const buildPageDocumentTitle = (title: string, untitledLabel: string): string => {
  const writtenTitle = title.trim();
  return `${writtenTitle.length > 0 ? writtenTitle : untitledLabel} · ${BRAND_NAME}`;
};

/** Trash and lock have different ways out, so each gets its own message instead of a generic "read only". */
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
