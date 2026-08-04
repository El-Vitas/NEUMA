import { extractPageContentSegments, joinPageContentSegmentsForDisplay } from '@company-brain/shared';
import type { FlatPageTreeItem, PageContent, PageLifecycle, PageSummary, PageTreeItem } from '../types/pages.types';

export const canEditPage = (canEditRole: boolean, lifecycle: PageLifecycle | null): boolean =>
  canEditRole && lifecycle !== 'TRASHED';

export const buildPageTree = (pages: readonly PageSummary[]): readonly PageTreeItem[] => {
  const childrenByParent = new Map<string | null, PageSummary[]>();
  for (const page of pages) {
    const siblings = childrenByParent.get(page.parentId) ?? [];
    siblings.push(page);
    childrenByParent.set(page.parentId, siblings);
  }

  const buildChildren = (parentId: string | null): readonly PageTreeItem[] =>
    (childrenByParent.get(parentId) ?? [])
      .toSorted((left, right) => left.order - right.order)
      .map((page) => ({ children: buildChildren(page.id), page }));

  return buildChildren(null);
};

export const extractPageText = (content: PageContent): string =>
  joinPageContentSegmentsForDisplay(extractPageContentSegments(content));

export const flattenPageTree = (tree: readonly PageTreeItem[], depth = 0): readonly FlatPageTreeItem[] =>
  tree.flatMap((item) => [{ depth, page: item.page }, ...flattenPageTree(item.children, depth + 1)]);
