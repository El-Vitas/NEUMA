'use client';

import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { watchWhatIsBeingRead } from '@/shared/lib/reading.lib';
import {
  PAGE_EDITOR_CONTENTS_INDENT_REM,
  PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS,
  PAGE_OUTLINE_COLLAPSED_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_STYLE_CLASS,
  PAGE_OUTLINE_HEADER_STYLE_CLASS,
  PAGE_OUTLINE_READING_LINE,
  PAGE_OUTLINE_READING_STYLE_CLASS,
  PAGE_OUTLINE_STYLE_CLASS,
  PAGE_OUTLINE_TOGGLE_STYLE_CLASS,
  PAGE_OUTLINE_VISIBILITY_STORAGE_KEY,
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
  const t = useTranslations('pages.outline');
  const [beingRead, setBeingRead] = useState<number | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const hasOwnChoice = useRef(false);

  useEffect(
    () =>
      watchWhatIsBeingRead(
        readTheWrittenHeadings(headings),
        (being) => setBeingRead(readWhichHeading(being)),
        PAGE_OUTLINE_READING_LINE,
      ),
    [headings],
  );

  useEffect(() => {
    if (!hasOwnChoice.current) setIsHidden(localStorage.getItem(PAGE_OUTLINE_VISIBILITY_STORAGE_KEY) === 'true');
  }, []);

  useEffect(() => {
    if (hasOwnChoice.current) localStorage.setItem(PAGE_OUTLINE_VISIBILITY_STORAGE_KEY, String(isHidden));
  }, [isHidden]);

  const toggleHidden = (): void => {
    hasOwnChoice.current = true;
    setIsHidden((current) => !current);
  };

  if (headings.length === 0) return null;

  if (isHidden) {
    return (
      <div className={PAGE_OUTLINE_COLLAPSED_STYLE_CLASS}>
        <button
          aria-expanded="false"
          aria-label={t('show')}
          className={PAGE_OUTLINE_TOGGLE_STYLE_CLASS}
          onClick={toggleHidden}
          title={t('show')}
          type="button"
        >
          <PanelRightOpen aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <nav aria-label={title} className={PAGE_OUTLINE_STYLE_CLASS}>
      <div className={PAGE_OUTLINE_HEADER_STYLE_CLASS}>
        <p className={PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS}>{title}</p>
        <button
          aria-expanded="true"
          aria-label={t('hide')}
          className={PAGE_OUTLINE_TOGGLE_STYLE_CLASS}
          onClick={toggleHidden}
          title={t('hide')}
          type="button"
        >
          <PanelRightClose aria-hidden="true" className="size-4" />
        </button>
      </div>
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
