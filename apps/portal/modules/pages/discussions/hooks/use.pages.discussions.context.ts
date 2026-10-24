'use client';

import { useContext } from 'react';
import { PAGES_DISCUSSIONS_CONTEXT } from '../constants/pages.discussions.context.constants';
import type { PagesDiscussionsContextValue } from '../types/pages.discussions.types';

/** Null where the editor shows a page with no live discussions, such as a version in the history. */
export const usePagesDiscussionsContext = (): PagesDiscussionsContextValue | null =>
  useContext(PAGES_DISCUSSIONS_CONTEXT);
