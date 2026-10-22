import type { PageBreadcrumbParent } from '../../tree/types/pages.tree.types';

export interface PagesBreadcrumbSegments {
  readonly collapsedParentPages: readonly PageBreadcrumbParent[];
  readonly visibleParentPages: readonly PageBreadcrumbParent[];
}
