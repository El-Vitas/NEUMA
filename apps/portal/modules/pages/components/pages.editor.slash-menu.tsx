'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { PAGE_EDITOR_COMMAND_GROUP_ORDER } from '../constants/pages.editor.constants';
import { buildSlashMenuOptionId } from '../lib/pages.editor.slash-menu.lib';
import type { PagesEditorMenuItem } from '../types/pages.editor.slash-menu.types';
import { PagesEditorSlashMenuItem } from './pages.editor.slash-menu.item';

interface IProps {
  readonly emptyMessage: string;
  readonly id?: string;
  readonly items: readonly PagesEditorMenuItem[];
  readonly label: string;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
  readonly selectedIndex: number;
}

export const PagesEditorSlashMenu = ({ emptyMessage, id, items, label, onSelect, selectedIndex }: IProps) => {
  const t = useTranslations('pages.commandGroups');
  const generatedMenuId = useId();
  const menuId = id ?? generatedMenuId;

  if (items.length === 0) {
    return <p className="border border-border bg-surface px-3 py-2 text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  const itemsWithId = items.map((item, index) => ({
    id: buildSlashMenuOptionId(menuId, item.id),
    index,
    item,
  }));
  const groupsInOrder = PAGE_EDITOR_COMMAND_GROUP_ORDER.map((group) => ({
    entries: itemsWithId.filter(({ item }) => item.group === group),
    group,
  })).filter(({ entries }) => entries.length > 0);
  const ungrouped = itemsWithId.filter(({ item }) => item.group === undefined);

  return (
    <div aria-label={label} className="border border-border bg-surface p-1 shadow-lg" id={menuId} role="listbox">
      {groupsInOrder.map(({ entries, group }) => (
        <div key={group}>
          <p className="px-3 pt-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">{t(group)}</p>
          {entries.map(({ id: optionId, index, item }) => (
            <PagesEditorSlashMenuItem
              id={optionId}
              isSelected={index === selectedIndex}
              item={item}
              key={item.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
      {ungrouped.map(({ id: optionId, index, item }) => (
        <PagesEditorSlashMenuItem
          id={optionId}
          isSelected={index === selectedIndex}
          item={item}
          key={item.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
