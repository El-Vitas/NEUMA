import { createContext } from 'react';
import type { PagesLoadedRows } from '../types/pages.loaded-rows.types';
import type { PagesRowQuery } from '../types/pages.row-query.types';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/** Milliseconds. Longer than a plain toast: it offers an undo, and the user needs time to notice the mistake. */
export const PAGE_BULK_UNDO_DURATION = 12_000;

/** Context rather than props: rows are rendered by the server inside the table, far from the selection bar above. */
export const PAGE_ROW_SELECTION_CONTEXT = createContext<null | PagesRowSelection>(null);

/**
 * The words the rows were searched by. The server reads the rows with them, so everything that asks it for more rows
 * (the next page, a calendar month, all that match) must ask with the same words.
 */
export const PAGE_ROW_QUERY_CONTEXT = createContext<PagesRowQuery>({ quickFilter: null, search: '' });

/**
 * The rows read after the first page are held by the groups that read them, but the selection, the bulk edit and the
 * search above the table must know them too, so each group reports what it loaded here.
 */
export const PAGE_LOADED_ROWS_CONTEXT = createContext<PagesLoadedRows>({ report: () => undefined });
