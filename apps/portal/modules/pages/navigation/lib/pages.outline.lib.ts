import {
  PAGE_EDITOR_HEADING_ATTRIBUTE,
  PAGE_OUTLINE_RAIL_MARK_FALLBACK_WIDTH_STYLE_CLASS,
  PAGE_OUTLINE_RAIL_MARK_WIDTH_STYLE_CLASS_BY_LEVEL,
} from '../../editor/structure/constants/pages.editor.contents.constants';
import type { PageEditorHeading } from '../../editor/structure/types/pages.editor.contents.types';

/** The outline lives outside the editor, so it finds headings by their data attribute, not their markup. */
export const readTheWrittenHeadings = (headings: readonly PageEditorHeading[]): readonly HTMLElement[] =>
  headings
    .map((_heading, which) =>
      document.querySelector<HTMLElement>(`[${PAGE_EDITOR_HEADING_ATTRIBUTE}="${String(which)}"]`),
    )
    .filter((heading) => heading !== null);

export const readWhichHeading = (heading: HTMLElement | null): number | null => {
  const marked = heading?.getAttribute(PAGE_EDITOR_HEADING_ATTRIBUTE) ?? null;
  if (marked === null) return null;
  const which = Number(marked);
  return Number.isInteger(which) ? which : null;
};

export const readPageOutlineRailMarkWidthStyleClass = (level: number): string =>
  PAGE_OUTLINE_RAIL_MARK_WIDTH_STYLE_CLASS_BY_LEVEL[level] ?? PAGE_OUTLINE_RAIL_MARK_FALLBACK_WIDTH_STYLE_CLASS;
