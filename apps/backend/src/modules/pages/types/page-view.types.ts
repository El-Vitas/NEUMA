import type { PageViewOutcome } from '../domain/page-view.domain.types';
import type { PageRowsPage } from './page-schema.types';

export interface PageViewSummary extends Pick<PageRowsPage, 'attachedFiles' | 'relatedRows'> {
  readonly hasMore: boolean;
  readonly outcome: PageViewOutcome;
  readonly rowCount: number;
  readonly spaceId: string;
  readonly totalRowCount: number;
}
