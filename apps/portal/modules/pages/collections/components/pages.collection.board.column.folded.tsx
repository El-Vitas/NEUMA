'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { readPageOptionDotClass, readPageOptionSurfaceClass } from '../lib/pages.option-color.lib';
import type { PageBoardColumnDrag } from '../types/pages.board-drag.types';
import type { PageViewGroup } from '../types/pages.schema.types';

interface IProps {
  readonly columnDrag: PageBoardColumnDrag;
  readonly group: PageViewGroup;
  readonly label: string;
  readonly onUnfold: () => void;
}

/**
 * Una columna doblada: una franja con su color, cuántas lleva y su nombre de
 * arriba abajo.
 *
 * Sigue siendo un sitio donde soltar otra columna. Si no lo fuera, una columna
 * doblada partiría el tablero en dos mitades entre las que no se puede pasar
 * nada.
 */
export const PagesCollectionBoardColumnFolded = ({ columnDrag, group, label, onUnfold }: IProps) => {
  const t = useTranslations('pages');

  return (
    <button
      aria-label={t('collection.unfoldColumnNamed', { column: label })}
      className={cn(
        'flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg py-3',
        readPageOptionSurfaceClass(group.color),
        columnDrag.carried === group.key && 'opacity-50',
        columnDrag.carried !== null && columnDrag.target === group.key && 'ring-2 ring-primary',
      )}
      data-testid="board-column-collapsed"
      onClick={onUnfold}
      onDragOver={(event) => {
        if (columnDrag.carried === null) return;
        event.preventDefault();
        columnDrag.onOver(group.key);
      }}
      onDrop={(event) => {
        if (columnDrag.carried === null) return;
        event.preventDefault();
        columnDrag.onDropOn(group.key);
      }}
      type="button"
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))} />
      <span className="font-medium text-muted-foreground text-xs tabular-nums">{group.rows.length}</span>
      {/* De arriba abajo: una franja de 44px no da para el nombre escrito de lado a lado. */}
      <span className="truncate font-medium text-foreground text-sm [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
};
