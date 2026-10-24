import { createContext } from 'react';
import type { PageCollectionLookups, PageCollectionLookupsUpdate } from '../types/pages.lookups.types';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from './pages.lookups.constants';

/**
 * Context rather than props: cells and filters sit deep inside tables, boards and cards of every view. It lives
 * apart from the empty value because server components read that one, and a server module cannot create a context.
 */
export const PAGE_COLLECTION_LOOKUPS_CONTEXT = createContext<PageCollectionLookups>(EMPTY_PAGE_COLLECTION_LOOKUPS);

/** Rows read later (load more) bring the names of what their cells point to; this is where they are added. */
export const PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT = createContext<(update: PageCollectionLookupsUpdate) => void>(
  () => undefined,
);
