'use client';

import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_PRIMARY_COMMAND_NAMES } from '../constants/pages.editor.constants';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import type { PageEditorCommand } from '../types/pages.types';
import { PagesEditorTurnIntoMenu } from './pages.editor.turn-into.menu';

interface IProps {
  readonly commands: Readonly<Record<string, PageEditorCommand>>;
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly onConvert: (targetId: string) => void;
  readonly onDismiss: () => void;
  readonly onRunCommand: (command: PageEditorCommand) => void;
}

export const PagesEditorToolbar = ({ commands, conversions, onConvert, onDismiss, onRunCommand }: IProps) => {
  const t = useTranslations('pages');
  const primaryCommands = PAGE_EDITOR_PRIMARY_COMMAND_NAMES.map(
    (commandName) => [commandName, commands[commandName]] as const,
  );
  const secondaryCommands = Object.entries(commands).filter(
    ([commandName]) =>
      !PAGE_EDITOR_PRIMARY_COMMAND_NAMES.some((primaryCommandName) => primaryCommandName === commandName),
  );

  return (
    <div
      aria-label={t('formattingTools')}
      className="flex max-w-[90vw] flex-wrap items-center gap-1 border border-border bg-surface shadow-lg"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onDismiss();
      }}
      role="toolbar"
    >
      {primaryCommands.map(([commandName, command]) => (
        <button
          aria-label={t(`commands.${command.labelKey}`)}
          className="min-h-11 min-w-11 px-3 text-foreground text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={commandName}
          onClick={() => onRunCommand(command)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          {t(`commands.${command.labelKey}`)}
        </button>
      ))}
      <PagesEditorTurnIntoMenu conversions={conversions} onConvert={onConvert} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t('moreFormattingTools')}
            className="min-h-11 min-w-11 px-3 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="mx-auto size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {secondaryCommands.map(([commandName, command]) => (
            <DropdownMenuItem key={commandName} onSelect={() => onRunCommand(command)}>
              {t(`commands.${command.labelKey}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
