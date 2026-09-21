'use client';

import type { PageOptionColor } from '@company-brain/shared';
import { PAGE_OPTION_COLOR_VALUES } from '@company-brain/shared';
import { Check, ChevronsLeftRight, ChevronsRightLeft, Gauge, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';

interface IProps {
  readonly color: PageOptionColor | null;
  readonly columns: PagesBoardColumns;
  readonly isCollapsed: boolean;
  readonly label: string;
  readonly onCollapse: () => void;
  readonly onLimitStart: () => void;
  readonly onRemoveAsk: () => void;
  readonly onRenameStart: () => void;
  readonly value: string;
}

/**
 * Lo que se puede hacer con una columna, donde está la columna.
 *
 * Una columna **es** un valor de la propiedad por la que el tablero agrupa, así
 * que renombrarla o quitarla toca esa propiedad en toda la colección. Por eso
 * quitar pasa antes por una pregunta que dice a cuántas filas deja sin valor:
 * es lo único de aquí que no se ve venir mirando la columna.
 */
export const PagesCollectionBoardColumnMenu = ({
  color,
  columns,
  isCollapsed,
  label,
  onCollapse,
  onLimitStart,
  onRemoveAsk,
  onRenameStart,
  value,
}: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('columnActions', { column: label })}
          className="size-8 text-muted-foreground hover:text-foreground"
          data-testid="board-column-menu"
          disabled={columns.isBusy}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={onRenameStart}>
          <Pencil aria-hidden="true" className="size-4" />
          {t('renameColumn')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span
              aria-hidden="true"
              className={cn('size-4 shrink-0 rounded-sm border border-border/60', readPageOptionColorClass(color))}
            />
            {t('columnColor')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('optionColorFor', { option: label })}
            </DropdownMenuLabel>
            {PAGE_OPTION_COLOR_VALUES.map((candidate) => (
              <DropdownMenuItem key={candidate} onSelect={() => columns.paintColumn(value, candidate)}>
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0 rounded-sm border border-border/60',
                    readPageOptionColorClass(candidate),
                  )}
                />
                <span className="flex-1">{t(`colors.${candidate}`)}</span>
                {candidate === color && <Check aria-hidden="true" className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCollapse}>
          {isCollapsed ? (
            <ChevronsLeftRight aria-hidden="true" className="size-4" />
          ) : (
            <ChevronsRightLeft aria-hidden="true" className="size-4" />
          )}
          {isCollapsed ? t('unfoldColumn') : t('collapseColumn')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLimitStart}>
          <Gauge aria-hidden="true" className="size-4" />
          {t('columnLimit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRemoveAsk} variant="destructive">
          <Trash2 aria-hidden="true" className="size-4" />
          {t('removeColumn')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
