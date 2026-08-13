'use client';

import { PAGE_EDITOR_COMMAND_ICONS } from '../constants/pages.editor.constants';
import type { PagesEditorMenuItem } from '../types/pages.editor.slash-menu.types';

interface IProps {
  readonly id: string;
  readonly isSelected: boolean;
  readonly item: PagesEditorMenuItem;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
}

export const PagesEditorSlashMenuItem = ({ id, isSelected, item, onSelect }: IProps) => {
  const Icon = PAGE_EDITOR_COMMAND_ICONS[item.id];

  return (
    <button
      aria-selected={isSelected}
      className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
      id={id}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect(item);
      }}
      role="option"
      type="button"
    >
      {Icon === undefined ? null : <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {item.label}
    </button>
  );
};
