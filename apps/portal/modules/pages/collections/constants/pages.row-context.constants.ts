import { createContext } from 'react';
import type { PagesRowSearch } from '../types/pages.row-search.types';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/** Milliseconds. Longer than a plain toast: it offers an undo, and the user needs time to notice the mistake. */
export const PAGE_BULK_UNDO_DURATION = 12_000;

/** Context rather than props: rows are rendered by the server inside the table, far from the selection bar above. */
export const PAGE_ROW_SELECTION_CONTEXT = createContext<null | PagesRowSelection>(null);

/** Context for the same reason as the selection: the search box sits above server-rendered rows. */
export const PAGE_ROW_SEARCH_CONTEXT = createContext<null | PagesRowSearch>(null);
