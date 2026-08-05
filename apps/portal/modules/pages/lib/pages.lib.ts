import { extractPageContentSegments, joinPageContentSegmentsForDisplay } from '@company-brain/shared';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import type { PageContent, PageLifecycle, PageSummary, PageTreeItem } from '../types/pages.types';

export const canEditPage = (canEditRole: boolean, lifecycle: PageLifecycle | null): boolean =>
  canEditRole && lifecycle !== 'TRASHED';

export const buildPageTree = (pages: readonly PageSummary[]): readonly PageTreeItem[] =>
  buildTree(pages, (page, children) => ({ children, page }));

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
