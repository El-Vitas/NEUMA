import type { PageViewOutcome } from '../domain/page-view.domain.types';

export interface PageViewSummary {
  readonly hasMore: boolean;
  readonly outcome: PageViewOutcome;
  readonly rowCount: number;
  readonly spaceId: string;
  readonly totalRowCount: number;
}
