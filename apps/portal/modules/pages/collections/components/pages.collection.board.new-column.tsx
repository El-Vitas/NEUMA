'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';

interface IProps {
  readonly disabled: boolean;
  /** Con una columna en la mano, este botón es además el sitio de soltarla al final. */
  readonly isCarryingColumn: boolean;
  readonly isColumnTarget: boolean;
  readonly onAdd: (name: string) => void;
  readonly onColumnDrop: () => void;
  readonly onColumnOver: () => void;
}

/**
 * Una columna más, al final de las que hay.
 *
 * Se pide el nombre antes de crearla porque una columna **es** su nombre: no
 * hay una columna sin nombre a la que ponérselo después, sería un valor vacío
 * de la propiedad y ninguna fila podría estar en ella.
 */
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
      // biome-ignore lint/a11y/noAutofocus: el campo es la respuesta al clic que acaba de abrirlo
      autoFocus
      className="w-40 shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm outline-none"
      disabled={disabled}
      onBlur={(event) => addIfNamed(event.target.value)}
      onKeyDown={answerKey}
      placeholder={t('newColumnName')}
    />
  );
};
