'use client';

import { cn } from '@/lib/utils';
import {
  PAGE_EDITOR_CONTENTS_INDENT_REM,
  PAGE_OUTLINE_ENTRY_BUTTON_COLLAPSED_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_BUTTON_EXPANDED_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_BUTTON_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_TEXT_COLLAPSED_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_TEXT_EXPANDED_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_TEXT_STYLE_CLASS,
  PAGE_OUTLINE_ENTRY_TEXT_TRANSITION_STYLE_CLASS,
  PAGE_OUTLINE_RAIL_MARK_READING_STYLE_CLASS,
  PAGE_OUTLINE_RAIL_MARK_STYLE_CLASS,
  PAGE_OUTLINE_READING_STYLE_CLASS,
} from '../constants/pages.editor.contents.constants';
import { readPageOutlineRailMarkWidthStyleClass } from '../lib/pages.outline.lib';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';

interface IProps {
  readonly heading: PageEditorHeading;
  readonly isExpanded: boolean;
  readonly isReading: boolean;
  readonly onSelect: (position: number) => void;
}

/**
 * One heading at the side: a mark whose length says its level even at rest,
 * and a name that only becomes visible once the rail has opened into a panel.
 * The name is never absent from the writing, only shrunk away, so a screen
 * reader meets it regardless of whether the rail is open.
 */
export const PagesOutlineEntry = ({ heading, isExpanded, isReading, onSelect }: IProps) => {
  const markWidthClassName = readPageOutlineRailMarkWidthStyleClass(heading.level);
  const indentStyle = isExpanded
    ? { marginInlineStart: `${String((heading.level - 1) * PAGE_EDITOR_CONTENTS_INDENT_REM)}rem` }
    : undefined;

  return (
    <button
      aria-current={isReading ? 'true' : undefined}
      aria-label={heading.title}
      className={cn(
        PAGE_OUTLINE_ENTRY_BUTTON_STYLE_CLASS,
        isExpanded ? PAGE_OUTLINE_ENTRY_BUTTON_EXPANDED_STYLE_CLASS : PAGE_OUTLINE_ENTRY_BUTTON_COLLAPSED_STYLE_CLASS,
      )}
      onClick={() => onSelect(heading.position)}
      /** The writing keeps the cursor while the heading is chosen, so it is the page that moves. */
      onMouseDown={(event) => event.preventDefault()}
      style={indentStyle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          PAGE_OUTLINE_RAIL_MARK_STYLE_CLASS,
          markWidthClassName,
          isReading && PAGE_OUTLINE_RAIL_MARK_READING_STYLE_CLASS,
        )}
      />
      <span
        className={cn(
          PAGE_OUTLINE_ENTRY_TEXT_STYLE_CLASS,
          isExpanded && PAGE_OUTLINE_ENTRY_TEXT_TRANSITION_STYLE_CLASS,
          isExpanded ? PAGE_OUTLINE_ENTRY_TEXT_EXPANDED_STYLE_CLASS : PAGE_OUTLINE_ENTRY_TEXT_COLLAPSED_STYLE_CLASS,
          isReading ? PAGE_OUTLINE_READING_STYLE_CLASS : PAGE_OUTLINE_ENTRY_STYLE_CLASS,
        )}
      >
        {heading.title}
      </span>
    </button>
  );
};
