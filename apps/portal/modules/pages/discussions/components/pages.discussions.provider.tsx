'use client';

import type { ReactNode } from 'react';
import { PAGES_DISCUSSIONS_CONTEXT } from '../constants/pages.discussions.context.constants';
import type { PagesDiscussionsContextValue } from '../types/pages.discussions.types';

interface IProps {
  readonly children: ReactNode;
  readonly value: PagesDiscussionsContextValue;
}

export const PagesDiscussionsProvider = ({ children, value }: IProps) => (
  <PAGES_DISCUSSIONS_CONTEXT.Provider value={value}>{children}</PAGES_DISCUSSIONS_CONTEXT.Provider>
);
