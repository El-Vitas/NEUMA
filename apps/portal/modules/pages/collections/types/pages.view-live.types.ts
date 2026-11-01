import type { PageGroupByMode } from '@neuma/shared';
import type { PagesBoardPaging } from './pages.board-paging.types';
import type { PageSchemaProperty, PageSchemaView, PageViewAggregates, PageViewBand } from './pages.schema.types';

export interface PagesViewLiveInput {
  /** The counts as the server drew them. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The bands as the server drew them; a view that does not group has one band with one unnamed group. */
  readonly bands: readonly PageViewBand[];
  /** Where to read what changed after those bands were read; null when the view cannot follow changes. */
  readonly changesCursor: null | string;
  /** Empty when the view does not group. */
  readonly groupByKey: string;
  readonly groupByMode: PageGroupByMode;
  readonly pageId: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  /** Empty when the view has a single grouping dimension. */
  readonly subGroupByKey: string;
  readonly view: PageSchemaView;
  /** Who looks; null when it is not known, and a filter that names the reader then goes to the server. */
  readonly viewerId: null | string;
}

/** Where the rows of a view come from: asked of the server, or filtered, sorted and grouped by the browser. */
export type PagesViewMode = 'client' | 'server';

export interface PagesViewLive extends PagesBoardPaging {
  /** The counts: the server's, or the ones the browser worked out or read again after rows were placed. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly mode: PagesViewMode;
}
