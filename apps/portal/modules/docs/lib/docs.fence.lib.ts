import type { ReactNode } from 'react';
import { DOCS_FENCE_LANGUAGE_CLASS, DOCS_FENCE_TRAILING_LINE } from '../constants/docs.reading.constants';

/** Null for inline code, which has no language class. */
export const readFenceLanguage = (className: string | undefined): string | null =>
  DOCS_FENCE_LANGUAGE_CLASS.exec(className ?? '')?.[1] ?? null;

export const readFenceText = (children: ReactNode): string =>
  typeof children === 'string' ? children.replace(DOCS_FENCE_TRAILING_LINE, '') : '';
