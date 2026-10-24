'use client';

import { useContext } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '../constants/pages.row-context.constants';
import type { PagesRowQuery } from '../types/pages.row-query.types';

export const usePagesRowQuery = (): PagesRowQuery => useContext(PAGE_ROW_QUERY_CONTEXT);
