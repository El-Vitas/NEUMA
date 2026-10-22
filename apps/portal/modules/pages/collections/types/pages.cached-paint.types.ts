import type { PageFilter } from '@neuma/shared';
import type { PageCollectionChanges } from './pages.query.types';
import type { PageRow, PageViewBand } from './pages.schema.types';
import type { CachedRowBody, PagesCollectionCacheSession, ReadCachedView } from './pages.view-cache.types';

/** A view found in the cache for the question the address asks, with what the cache knows of when it was read. */
export interface CachedPaint {
  /** Where to read what changed after the rows kept were read; null when the cache has none. */
  readonly changesCursor: null | string;
  /** Every row the layout cites. */
  readonly ids: readonly string[];
  readonly key: string;
  readonly read: ReadCachedView;
}

export interface CachedPaintChangesInput {
  readonly changes: PageCollectionChanges;
  readonly hasSearch: boolean;
  readonly paint: CachedPaint;
  readonly quickFilter: null | PageFilter;
}

/** A painted copy with what changed since placed in it, and what the cache should keep of it. */
export interface CachedPaintChanges {
  readonly bands: readonly PageViewBand[];
  readonly bodies: readonly CachedRowBody[];
  /** Where the next read of changes starts. */
  readonly cursor: string;
}

/** A painted screen of days with what changed since placed in it, and what the cache should keep of it. */
export interface CachedWindowChanges {
  readonly bodies: readonly CachedRowBody[];
  /** Where the next read of changes starts. */
  readonly cursor: string;
  /** True when a row came in, went out or changed, so the count of rows without a date is worth reading again. */
  readonly hasChanged: boolean;
  readonly rows: readonly PageRow[];
  readonly undatedRows: readonly PageRow[];
}

/** The rows of a screen of days once what changed since was placed in them. */
export interface CachedWindowRows {
  readonly rows: readonly PageRow[];
  readonly undated: number;
  readonly undatedRows: readonly PageRow[];
}

export interface PagesCachedRevalidationInput {
  readonly hasSearch: boolean;
  readonly pageId: string;
  readonly paint: CachedPaint | null;
  readonly quickFilter: null | PageFilter;
  readonly session: null | PagesCollectionCacheSession;
  readonly spaceId: string;
}

export interface PagesCachedRevalidation {
  /** The bands with what changed since placed in them; null while the copy is as it was kept. */
  readonly bands: null | readonly PageViewBand[];
  /** The server refused the reader the collection, and the cache emptied what it kept of it. */
  readonly isPurged: boolean;
  /** The question these belong to. */
  readonly key: string;
  /** The rows of a calendar or a timeline with what changed since placed in them; null while the copy is as kept. */
  readonly window: CachedWindowRows | null;
}
