import type { PageBreadcrumbParent } from '../../tree/types/pages.tree.types';
import { PAGES_BREADCRUMB_MAX_VISIBLE_PARENT_PAGES } from '../constants/pages.breadcrumb.constants';
import type { PagesBreadcrumbSegments } from '../types/pages.breadcrumb.types';

export const splitBreadcrumbParentPages = (parentPages: readonly PageBreadcrumbParent[]): PagesBreadcrumbSegments => {
  if (parentPages.length <= PAGES_BREADCRUMB_MAX_VISIBLE_PARENT_PAGES) {
    return { collapsedParentPages: [], visibleParentPages: parentPages };
  }

  const firstVisibleIndex = parentPages.length - PAGES_BREADCRUMB_MAX_VISIBLE_PARENT_PAGES;
  return {
    collapsedParentPages: parentPages.slice(0, firstVisibleIndex),
    visibleParentPages: parentPages.slice(firstVisibleIndex),
  };
};

export const resolveBreadcrumbLabel = (value: string | undefined, fallback: string): string =>
  value === undefined || value.length === 0 ? fallback : value;
