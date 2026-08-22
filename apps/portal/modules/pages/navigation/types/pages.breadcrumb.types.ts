import type { PageSummary } from '../../types/pages.types';

export interface PagesBreadcrumbSegments {
  readonly collapsedParentPages: readonly PageSummary[];
  readonly visibleParentPages: readonly PageSummary[];
}
