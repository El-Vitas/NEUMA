import { createContext } from 'react';
import type { PagesRowOrdering } from '../types/pages.row-ordering.types';
import type { PagesRowQuery } from '../types/pages.row-query.types';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/** Milliseconds. Longer than a plain toast: it offers an undo, and the user needs time to notice the mistake. */
export const PAGE_BULK_UNDO_DURATION = 12_000;

/** Requests of one bulk action in flight at once; the rest wait their turn. */
export const PAGE_BULK_CONCURRENCY = 8;

/**
 * How the rows of a table that follows its own order are put in another place. Null when they cannot be: the view
 * sorts them, or whoever looks may not edit.
 */
export const PAGE_ROW_ORDERING_CONTEXT = createContext<null | PagesRowOrdering>(null);

/** Context rather than props: rows are rendered by the server inside the table, far from the selection bar above. */
export const PAGE_ROW_SELECTION_CONTEXT = createContext<null | PagesRowSelection>(null);

/**
 * The words the rows were searched by. The server reads the rows with them, so everything that asks it for more rows
 * (the next page, a calendar month, all that match) must ask with the same words.
 */
export const PAGE_ROW_QUERY_CONTEXT = createContext<PagesRowQuery>({ quickFilter: null, search: '' });
