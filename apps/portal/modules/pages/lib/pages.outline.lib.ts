import { PAGE_EDITOR_HEADING_ATTRIBUTE } from '../constants/pages.editor.contents.constants';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';

/**
 * Each listed heading as it stands in the writing, in the order it is listed.
 *
 * The index at the side is drawn outside the writing, so it reaches the headings
 * by the mark the page puts on them rather than by looking for what a heading is
 * made of, which changes with how the page is drawn.
 */
export const readTheWrittenHeadings = (headings: readonly PageEditorHeading[]): readonly HTMLElement[] =>
  headings
    .map((_heading, which) =>
      document.querySelector<HTMLElement>(`[${PAGE_EDITOR_HEADING_ATTRIBUTE}="${String(which)}"]`),
    )
    .filter((heading) => heading !== null);

/** Which of the listed headings a written one is, or none if it is not one of them. */
export const readWhichHeading = (heading: HTMLElement | null): number | null => {
  const marked = heading?.getAttribute(PAGE_EDITOR_HEADING_ATTRIBUTE) ?? null;
  if (marked === null) return null;
  const which = Number(marked);
  return Number.isInteger(which) ? which : null;
};
