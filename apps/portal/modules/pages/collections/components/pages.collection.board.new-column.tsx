'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';

interface IProps {
  readonly disabled: boolean;
  /** While a column is dragged, the button doubles as the drop target for the end position. */
  readonly isCarryingColumn: boolean;
  readonly isColumnTarget: boolean;
  readonly onAdd: (name: string) => void;
  readonly onColumnDrop: () => void;
  readonly onColumnOver: () => void;
}

/** The name is asked first because a column is its name: an unnamed one would be an empty property value. */
export const PagesCollectionBoardNewColumn = ({
  disabled,
  isCarryingColumn,
  isColumnTarget,
  onAdd,
  onColumnDrop,
  onColumnOver,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const [isNaming, setIsNaming] = useState(false);

  const addIfNamed = (name: string): void => {
    setIsNaming(false);
    if (name.trim() !== '') onAdd(name.trim());
  };

  const answerKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addIfNamed(event.currentTarget.value);
      return;
    }
    if (event.key === 'Escape') setIsNaming(false);
  };

  if (!isNaming) {
    return (
      <Button
        className={cn(
          'w-40 shrink-0 justify-start rounded-lg text-muted-foreground hover:text-foreground',
          isColumnTarget && 'ring-2 ring-primary',
        )}
        data-testid="board-new-column"
        disabled={disabled}
        onClick={() => setIsNaming(true)}
        onDragOver={(event) => {
          if (!isCarryingColumn) return;
          event.preventDefault();
          onColumnOver();
        }}
        onDrop={(event) => {
          if (!isCarryingColumn) return;
          event.preventDefault();
          onColumnDrop();
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t('newColumn')}
      </Button>
    );
  }

  return (
    <input
      aria-label={t('newColumnName')}
      // biome-ignore lint/a11y/noAutofocus: the field answers the click that just opened it
      autoFocus
      className="w-40 shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm outline-none"
      disabled={disabled}
      onBlur={(event) => addIfNamed(event.target.value)}
      onKeyDown={answerKey}
      placeholder={t('newColumnName')}
    />
  );
};
