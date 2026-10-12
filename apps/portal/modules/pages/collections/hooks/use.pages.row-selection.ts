'use client';

import { useContext } from 'react';
import { PAGE_ROW_SELECTION_CONTEXT } from '../constants/pages.row-context.constants';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/** Null where no provider exists (a table embedded in another page), so callers can skip their checkboxes. */
export const usePagesRowSelection = (): null | PagesRowSelection => useContext(PAGE_ROW_SELECTION_CONTEXT);
