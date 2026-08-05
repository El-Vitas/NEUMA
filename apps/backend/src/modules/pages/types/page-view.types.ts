import type { PageViewOutcome } from '../domain/page-view.domain.types';

export interface PageViewSummary {
  readonly outcome: PageViewOutcome;
  readonly spaceId: string;
}
