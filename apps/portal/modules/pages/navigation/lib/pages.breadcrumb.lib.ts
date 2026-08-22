import type { PageSummary } from '../../types/pages.types';
import { PAGES_BREADCRUMB_MAX_VISIBLE_PARENT_PAGES } from '../constants/pages.breadcrumb.constants';
import type { PagesBreadcrumbSegments } from '../types/pages.breadcrumb.types';

/**
 * A deep trail keeps only its tail visible: the segments nearest to where the
 * reader stands. What lies further back still exists, just not open in front
 * of them until they ask for it.
 */
export const splitBreadcrumbParentPages = (parentPages: readonly PageSummary[]): PagesBreadcrumbSegments => {
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
