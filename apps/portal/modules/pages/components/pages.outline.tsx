'use client';

import { useEffect, useState } from 'react';
import { watchWhatIsBeingRead } from '@/shared/lib/reading.lib';
import {
  PAGE_EDITOR_CONTENTS_INDENT_REM,
  PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_STYLE_CLASS,
  PAGE_OUTLINE_READING_LINE,
  PAGE_OUTLINE_READING_STYLE_CLASS,
  PAGE_OUTLINE_STYLE_CLASS,
} from '../constants/pages.editor.contents.constants';
import { readTheWrittenHeadings, readWhichHeading } from '../lib/pages.outline.lib';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';

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

  useEffect(
    () =>
      watchWhatIsBeingRead(
        readTheWrittenHeadings(headings),
        (being) => setBeingRead(readWhichHeading(being)),
        PAGE_OUTLINE_READING_LINE,
      ),
    [headings],
  );

  if (headings.length === 0) return null;

  return (
    <nav aria-label={title} className={PAGE_OUTLINE_STYLE_CLASS}>
      <p className={PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS}>{title}</p>
      {headings.map((heading, which) => (
        <button
          aria-current={which === beingRead ? 'true' : undefined}
          className={which === beingRead ? PAGE_OUTLINE_READING_STYLE_CLASS : PAGE_OUTLINE_ENTRY_STYLE_CLASS}
          key={`${String(heading.position)}:${heading.title}`}
          onClick={() => onGoToHeading(heading.position)}
          /** The writing keeps the cursor while the heading is chosen, so it is the page that moves. */
          onMouseDown={(event) => event.preventDefault()}
          style={{ marginInlineStart: `${String((heading.level - 1) * PAGE_EDITOR_CONTENTS_INDENT_REM)}rem` }}
          type="button"
        >
          {heading.title}
        </button>
      ))}
    </nav>
  );
};
