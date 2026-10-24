import type { PageOptionColor } from '@neuma/shared';
import type { BrowserLocalCache, CacheableBody, LocalCache } from '../../local-cache/types/local-cache.types';
import type { PageCollectionLookups } from './pages.lookups.types';
import type {
  PageCalendarReading,
  PagePersonOption,
  PageRow,
  PageSchema,
  PageSchemaView,
  PageTimelineReading,
  PageViewAggregates,
  PageViewBand,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from './pages.schema.types';

/** A row the cache holds and the version it holds it at. */
export interface HeldRowVersion {
  readonly id: string;
  readonly version: number;
}

/** What forgetting revoked rows needs of a cache: to see what it holds and to let go of it. */
export type RevocableCache = Pick<LocalCache<CacheableBody>, 'purgeRecords' | 'readRecord' | 'rewriteLayouts'>;

export interface CacheRevocationInput {
  readonly cache: RevocableCache;
  /** The rows a view cited before and no longer cites. */
  readonly droppedIds: readonly string[];
  /** Which of the rows named the reader may no longer open; null when the server could not be asked. */
  readonly readRevoked: (held: readonly HeldRowVersion[]) => Promise<null | readonly string[]>;
}

/** A row as the cache keeps it: the row itself, and when this browser read it. */
export interface CachedRowBody extends CacheableBody {
  readonly row: PageRow;
}

export interface CachedGroupLayout {
  readonly color: null | PageOptionColor;
  readonly key: string;
  readonly label: string;
  readonly nextCursor: null | string;
  readonly rowIds: readonly string[];
}

export interface CachedBandLayout {
  readonly color: null | PageOptionColor;
  readonly groups: readonly CachedGroupLayout[];
  readonly key: string;
  readonly label: string;
}

export type CachedTimelineLayout = Omit<PageTimelineReading, 'undatedRows'> & {
  readonly undatedRowIds: readonly string[];
};

export interface PagesViewCachingInput extends Omit<ToCachedViewInput, 'aggregates'> {
  /** The counts, which arrive after the rows. */
  readonly aggregates: Promise<null | PageViewAggregates>;
  /** Where to read what changed after these rows were read. */
  readonly changesCursor: null | string;
  readonly pageId: string;
}

export interface PagesCollectionCacheSession extends BrowserLocalCache<CachedRowBody> {
  readonly userId: string;
}

/** How a view was arranged, as ids to resolve against the cached rows, with what the view needs to be drawn again. */
export interface CachedViewLayout {
  readonly aggregates: PageViewAggregates | null;
  /** Empty for a screen of days, which holds its rows in `windowRowIds`. */
  readonly bands: readonly CachedBandLayout[];
  readonly calendar: PageCalendarReading | null;
  readonly lookups: PageCollectionLookups;
  readonly personOptions: readonly PagePersonOption[];
  readonly schema: PageSchema;
  readonly timeline: CachedTimelineLayout | null;
  readonly viewId: string;
  readonly viewerId: null | string;
  readonly windowRowIds: readonly string[];
}

export interface ToCachedViewInput {
  readonly aggregates: PageViewAggregates | null;
  readonly lookups: PageCollectionLookups;
  readonly outcome: PageViewBandedOutcome | PageViewFlatOutcome | PageViewGroupedOutcome;
  readonly personOptions: readonly PagePersonOption[];
  readonly schema: PageSchema;
  readonly view: PageSchemaView;
  readonly viewerId: null | string;
}

export interface CachedView {
  /** Every row the layout cites, in the order they appear. */
  readonly ids: readonly string[];
  readonly layout: string;
  /** The rows to keep, without what is computed. */
  readonly rows: readonly PageRow[];
}

/** A cached layout with its rows put back: what a view needs to be drawn without asking the server. */
export interface ReadCachedView {
  readonly aggregates: PageViewAggregates | null;
  readonly bands: readonly PageViewBand[];
  readonly calendar: PageCalendarReading | null;
  readonly lookups: PageCollectionLookups;
  readonly personOptions: readonly PagePersonOption[];
  readonly schema: PageSchema;
  readonly timeline: PageTimelineReading | null;
  readonly view: PageSchemaView;
  readonly viewerId: null | string;
  readonly windowRows: readonly PageRow[];
}

/** What the address of the page says of the question a view answers, as the address wrote it. */
export interface ViewCacheKeyInput {
  readonly day: null | string;
  readonly filter: null | string;
  readonly month: null | string;
  readonly pageId: string;
  readonly search: null | string;
  readonly viewName: string;
}
