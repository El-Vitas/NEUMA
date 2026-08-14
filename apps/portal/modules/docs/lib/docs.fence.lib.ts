import type { ReactNode } from 'react';
import { DOCS_FENCE_LANGUAGE_CLASS, DOCS_FENCE_TRAILING_LINE } from '../constants/docs.reading.constants';

/**
 * What a fenced block says it is written in, and nothing when it says nothing —
 * which is how writing fenced off in the middle of a line tells itself apart
 * from writing fenced off on lines of its own.
 */
export const readFenceLanguage = (className: string | undefined): string | null =>
  DOCS_FENCE_LANGUAGE_CLASS.exec(className ?? '')?.[1] ?? null;

/** What is written inside a fenced block, which is text and only text. */
export const readFenceText = (children: ReactNode): string =>
  typeof children === 'string' ? children.replace(DOCS_FENCE_TRAILING_LINE, '') : '';
