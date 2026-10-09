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
} from '../../editor/structure/constants/pages.editor.contents.constants';
import type { PageEditorHeading } from '../../editor/structure/types/pages.editor.contents.types';
import { readPageOutlineRailMarkWidthStyleClass } from '../lib/pages.outline.lib';

interface IProps {
  readonly heading: PageEditorHeading;
  readonly isExpanded: boolean;
  readonly isReading: boolean;
  readonly onSelect: (position: number) => void;
}

/** The name is shrunk, not removed, when the rail is collapsed, so screen readers still reach it. */
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
      /** Keeps the editor selection while a heading is picked. */
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
