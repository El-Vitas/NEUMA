'use client';

import { type FocusEvent, type KeyboardEvent, type MouseEvent, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { watchWhatIsBeingRead } from '@/shared/lib/reading.lib';
import {
  PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS,
  PAGE_OUTLINE_LIST_SCROLL_STYLE_CLASS,
  PAGE_OUTLINE_PANEL_STYLE_CLASS,
  PAGE_OUTLINE_RAIL_STYLE_CLASS,
  PAGE_OUTLINE_READING_LINE,
  PAGE_OUTLINE_STYLE_CLASS,
} from '../../editor/structure/constants/pages.editor.contents.constants';
import type { PageEditorHeading } from '../../editor/structure/types/pages.editor.contents.types';
import { readTheWrittenHeadings, readWhichHeading } from '../lib/pages.outline.lib';
import { PagesOutlineEntry } from './pages.outline.entry';

interface IProps {
  readonly headings: readonly PageEditorHeading[];
  readonly onGoToHeading: (position: number) => void;
  readonly title: string;
}

/**
 * Where everything in a page is, kept at the side of the page itself.
 *
 * The index block belongs to whoever writes the page and lives in the writing;
 * this one belongs to whoever reads it and is always there, without costing a
 * line. It marks the heading being read, which is what turns a list of names
 * into a place to stand, and a page with nothing to list shows nothing at all.
 */
export const PagesOutline = ({ headings, onGoToHeading, title }: IProps) => {
  const [beingRead, setBeingRead] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(
    () =>
      watchWhatIsBeingRead(
        readTheWrittenHeadings(headings),
        (being) => setBeingRead(readWhichHeading(being)),
        PAGE_OUTLINE_READING_LINE,
      ),
    [headings],
  );

  const expand = (): void => setIsExpanded(true);

  const collapseIfFocusLeaves = (event: FocusEvent<HTMLElement>): void => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setIsExpanded(false);
  };

  const collapseIfPointerLeavesAndUnfocused = (event: MouseEvent<HTMLElement>): void => {
    if (event.currentTarget.contains(document.activeElement)) return;
    setIsExpanded(false);
  };

  const collapseOnEscape = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Escape') return;
    setIsExpanded(false);
  };

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label={title}
      className={PAGE_OUTLINE_STYLE_CLASS}
      onBlur={collapseIfFocusLeaves}
      onFocus={expand}
      onKeyDown={collapseOnEscape}
      onMouseEnter={expand}
      onMouseLeave={collapseIfPointerLeavesAndUnfocused}
    >
      <div
        className={cn(
          PAGE_OUTLINE_LIST_SCROLL_STYLE_CLASS,
          isExpanded ? PAGE_OUTLINE_PANEL_STYLE_CLASS : PAGE_OUTLINE_RAIL_STYLE_CLASS,
        )}
      >
        {isExpanded && <p className={PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS}>{title}</p>}
        {headings.map((heading, which) => (
          <PagesOutlineEntry
            heading={heading}
            isExpanded={isExpanded}
            isReading={which === beingRead}
            key={`${String(heading.position)}:${heading.title}`}
            onSelect={onGoToHeading}
          />
        ))}
      </div>
    </nav>
  );
};
