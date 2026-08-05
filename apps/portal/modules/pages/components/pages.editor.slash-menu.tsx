'use client';

import { useTranslations } from 'next-intl';
import type { PageEditorCommand } from '../types/pages.types';

interface IProps {
  readonly commands: readonly (readonly [string, PageEditorCommand])[];
  readonly onSelect: (command: PageEditorCommand) => void;
  readonly selectedIndex: number;
}

export const PagesEditorSlashMenu = ({ commands, onSelect, selectedIndex }: IProps) => {
  const t = useTranslations('pages');
  if (commands.length === 0) {
    return <p className="border border-border bg-surface px-3 py-2 text-muted-foreground text-sm">{t('noCommands')}</p>;
  }

  return (
    <div aria-label={t('slashCommands')} className="border border-border bg-surface p-1 shadow-lg" role="listbox">
      {commands.map(([commandName, command], index) => (
        <button
          aria-selected={index === selectedIndex}
          className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
          key={commandName}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(command);
          }}
          role="option"
          type="button"
        >
          {t(`commands.${command.labelKey}`)}
        </button>
      ))}
    </div>
  );
};
