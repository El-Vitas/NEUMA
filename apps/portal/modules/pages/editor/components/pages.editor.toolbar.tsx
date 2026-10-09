'use client';

import type { PageBlockColor } from '@neuma/shared';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import type { PageEditorCommand } from '../../types/pages.types';
import { PagesEditorBlockColorItems } from '../blocks/components/pages.editor.block-color.items';
import { PagesEditorTurnIntoMenu } from '../blocks/components/pages.editor.turn-into.menu';
import type { PageEditorBlockColorKind, PageEditorBlockColors } from '../blocks/types/pages.editor.block-color.types';
import type { PageEditorBlockConversion } from '../blocks/types/pages.editor.convert.types';
import {
  PAGE_EDITOR_PRIMARY_COMMAND_NAMES,
  PAGE_EDITOR_TOOL_IN_USE_STYLE_CLASS,
  PAGE_EDITOR_TOOL_STYLE_CLASS,
} from '../constants/pages.editor.constants';

interface IProps {
  readonly colors: PageEditorBlockColors;
  readonly commands: Readonly<Record<string, PageEditorCommand>>;
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly marksInUse: readonly string[];
  readonly onColor: (kind: PageEditorBlockColorKind, color: PageBlockColor | null) => void;
  readonly onComment: () => void;
  readonly onConvert: (targetId: string) => void;
  readonly onDismiss: () => void;
  readonly onRunCommand: (command: PageEditorCommand) => void;
}

export const PagesEditorToolbar = ({
  colors,
  commands,
  conversions,
  marksInUse,
  onColor,
  onComment,
  onConvert,
  onDismiss,
  onRunCommand,
}: IProps) => {
  const t = useTranslations('pages');
  const primaryCommands = PAGE_EDITOR_PRIMARY_COMMAND_NAMES.map(
    (commandName) => [commandName, commands[commandName]] as const,
  );
  const primaryCommandNames: readonly string[] = PAGE_EDITOR_PRIMARY_COMMAND_NAMES;
  const secondaryCommands = Object.entries(commands).filter(
    ([commandName]) => !primaryCommandNames.includes(commandName),
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
          aria-pressed={command.mark === undefined ? undefined : marksInUse.includes(command.mark)}
          className={
            command.mark !== undefined && marksInUse.includes(command.mark)
              ? PAGE_EDITOR_TOOL_IN_USE_STYLE_CLASS
              : PAGE_EDITOR_TOOL_STYLE_CLASS
          }
          key={commandName}
          onClick={() => onRunCommand(command)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          {t(`commands.${command.labelKey}`)}
        </button>
      ))}
      <PagesEditorTurnIntoMenu conversions={conversions} onConvert={onConvert} />
      <button
        className="min-h-11 min-w-11 px-3 text-foreground text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onComment}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        {t('commentBlock')}
      </button>
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('textColor')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <PagesEditorBlockColorItems onSelect={(color) => onColor('text', color)} selected={colors.text} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('backgroundColor')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <PagesEditorBlockColorItems
                onSelect={(color) => onColor('background', color)}
                selected={colors.background}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
