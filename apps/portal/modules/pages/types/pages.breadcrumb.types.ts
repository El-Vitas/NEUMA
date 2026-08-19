import type { PageSummary } from './pages.types';

export interface PagesBreadcrumbSegments {
  readonly collapsedParentPages: readonly PageSummary[];
  readonly visibleParentPages: readonly PageSummary[];
}
