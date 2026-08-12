'use client';

import { useTranslations } from 'next-intl';
import { PAGE_EDITOR_COMMAND_GROUP_ORDER, PAGE_EDITOR_COMMAND_ICONS } from '../constants/pages.editor.constants';
import type { PagesEditorMenuItem } from '../types/pages.editor.slash-menu.types';

interface IProps {
  readonly emptyMessage: string;
  readonly items: readonly PagesEditorMenuItem[];
  readonly label: string;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
  readonly selectedIndex: number;
}

export const PagesEditorSlashMenu = ({ emptyMessage, items, label, onSelect, selectedIndex }: IProps) => {
  const t = useTranslations('pages.commandGroups');

  if (items.length === 0) {
    return <p className="border border-border bg-surface px-3 py-2 text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  const groupsInOrder = PAGE_EDITOR_COMMAND_GROUP_ORDER.map((group) => ({
    entries: items.flatMap((item, index) => (item.group === group ? [{ index, item }] : [])),
    group,
  })).filter(({ entries }) => entries.length > 0);
  const ungrouped = items.flatMap((item, index) => (item.group === undefined ? [{ index, item }] : []));

  return (
    <div aria-label={label} className="border border-border bg-surface p-1 shadow-lg" role="listbox">
      {groupsInOrder.map(({ entries, group }) => (
        <div key={group}>
          <p className="px-3 pt-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">{t(group)}</p>
          {entries.map(({ index, item }) => {
            const Icon = PAGE_EDITOR_COMMAND_ICONS[item.id];
            return (
              <button
                aria-selected={index === selectedIndex}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
                key={item.id}
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
          })}
        </div>
      ))}
      {ungrouped.map(({ index, item }) => (
        <button
          aria-selected={index === selectedIndex}
          className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
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
