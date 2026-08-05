'use client';

import type { PagesEditorMenuItem } from '../types/pages.editor.slash-menu.types';

interface IProps {
  readonly emptyMessage: string;
  readonly items: readonly PagesEditorMenuItem[];
  readonly label: string;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
  readonly selectedIndex: number;
}

export const PagesEditorSlashMenu = ({ emptyMessage, items, label, onSelect, selectedIndex }: IProps) => {
  if (items.length === 0) {
    return <p className="border border-border bg-surface px-3 py-2 text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <div aria-label={label} className="border border-border bg-surface p-1 shadow-lg" role="listbox">
      {items.map((item, index) => (
        <button
          aria-selected={index === selectedIndex}
          className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
          key={item.id}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item);
          }}
          role="option"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
