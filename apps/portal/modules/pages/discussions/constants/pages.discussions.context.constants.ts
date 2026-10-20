'use client';

import { createContext } from 'react';
import type { PagesDiscussionsContextValue } from '../types/pages.discussions.types';

export const PAGES_DISCUSSIONS_CONTEXT = createContext<PagesDiscussionsContextValue | null>(null);
