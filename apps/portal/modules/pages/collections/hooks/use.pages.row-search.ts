'use client';

import { useContext } from 'react';
import { PAGE_ROW_SEARCH_CONTEXT } from '../constants/pages.row-context.constants';
import type { PagesRowSearch } from '../types/pages.row-search.types';

/** Lo que se esté buscando alrededor, o nada donde nadie esté buscando. */
export const usePagesRowSearch = (): null | PagesRowSearch => useContext(PAGE_ROW_SEARCH_CONTEXT);
