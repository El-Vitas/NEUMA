'use client';

import { PAGE_COLUMN_ALIGNMENT_VALUES } from '@company-brain/shared';
import { GripVertical, Pin, PinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { TableHead } from '@/shared/components/ui/table';
import { PAGE_TABLE_COLUMN_WIDTH_STEP } from '../constants/pages.collections.constants';
import { clampTableColumnWidth } from '../lib/pages.table-columns.lib';
import type { PagesTableColumns } from '../types/pages.table-columns.types';

interface IProps {
  readonly columnKey: string;
  readonly columns: null | PagesTableColumns;
  /** Lo que la deja quieta al desplazarse, o nada cuando esta columna no se queda. */
  readonly frozen: { readonly className?: string; readonly style?: { readonly left: number } };
  readonly headerId: string;
  readonly label: string;
  /** Lo que va antes del nombre de la columna, si algo va: la casilla de marcar todas las filas. */
  readonly leading?: ReactNode;
  /** El nombre no se mueve ni se quita de primera: es la columna que abre cada fila. */
  readonly movable: boolean;
  readonly onDragEnd: () => void;
  readonly onDragOver: () => void;
  readonly onDrop: () => void;
  readonly onDragStart: () => void;
  readonly onResize: (width: number) => void;
  readonly onResizeEnd: (width: number) => void;
  /** Cuál es de izquierda a derecha, contando la del nombre como la primera. */
  readonly position: number;
  readonly width: number;
}

/**
 * El encabezado de una columna, que es donde se manda sobre ella.
 *
 * Tres cosas y cada una con su asa, porque son tres gestos distintos sobre el
 * mismo sitio: tomarla para cambiarla de orden, estirar su borde para darle
 * ancho, y decir desde su menú hasta dónde se queda quieta la tabla. Las tres
 * se hacen también con el teclado: arrastrar no puede ser la única manera.
 */
export const PagesCollectionTableHeaderCell = ({
  columnKey,
  columns,
  frozen,
  headerId,
  label,
  leading = null,
  movable,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onResize,
  onResizeEnd,
  position,
  width,
}: IProps) => {
  const t = useTranslations('pages.collection');

  const answerHandleKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || columns === null) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    columns.moveColumnSideways(columnKey, event.key === 'ArrowLeft' ? 'EARLIER' : 'LATER');
  };

  const answerResizeKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -PAGE_TABLE_COLUMN_WIDTH_STEP : PAGE_TABLE_COLUMN_WIDTH_STEP;
    onResizeEnd(clampTableColumnWidth(width + step));
  };

  /**
   * El ancho sigue al puntero mientras dura el gesto y se guarda al soltarlo:
   * mandar uno por cada píxel recorrido sería una llamada por movimiento de la
   * mano, y el ancho que importa es donde se soltó.
   */
  const startResizing = (event: PointerEvent<HTMLButtonElement>): void => {
    const from = event.clientX;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    let last = width;
    const follow = (moved: globalThis.PointerEvent): void => {
      last = clampTableColumnWidth(width + moved.clientX - from);
      onResize(last);
    };
    const finish = (): void => {
      handle.removeEventListener('pointermove', follow);
      handle.removeEventListener('pointerup', finish);
      onResizeEnd(last);
    };
    handle.addEventListener('pointermove', follow);
    handle.addEventListener('pointerup', finish);
  };

  return (
    <TableHead
      /* Por encima del cuerpo: la cabecera es la que tiene las asas, y lo que pasa por debajo no debe taparlas. */
      className={cn('relative', frozen.className, frozen.className !== undefined && 'z-20')}
      id={headerId}
      /* La del nombre no recibe: nada puede quedar antes que ella, así que no es un hueco donde soltar. */
      onDragOver={(event) => {
        if (columns === null || !movable) return;
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        if (columns === null || !movable) return;
        event.preventDefault();
        onDrop();
      }}
      style={frozen.style}
    >
      <span className="flex items-center gap-1">
        {columns !== null && movable && (
          <button
            aria-label={t('moveTableColumn', { column: label })}
            className="-ml-1 cursor-grab text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            data-testid="table-column-handle"
            draggable
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onKeyDown={answerHandleKey}
            type="button"
          >
            <GripVertical aria-hidden="true" className="size-3.5" />
          </button>
        )}
        {leading}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {columns !== null && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('tableColumnActions', { column: label })}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="table-column-menu"
              type="button"
            >
              {frozen.className === undefined ? (
                <PinOff aria-hidden="true" className="size-3.5" />
              ) : (
                <Pin aria-hidden="true" className="size-3.5" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => columns.setFrozenColumns(position + 1)}>
                <Pin aria-hidden="true" className="size-4" />
                {t('freezeHere')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => columns.setFrozenColumns(0)}>
                <PinOff aria-hidden="true" className="size-4" />
                {t('freezeNone')}
              </DropdownMenuItem>
              {/* Hacia qué lado se pega esta columna: se elige aquí, que es donde se la está mirando. */}
              {PAGE_COLUMN_ALIGNMENT_VALUES.map((alignment) => (
                <DropdownMenuItem key={alignment} onSelect={() => columns.setAlignment(columnKey, alignment)}>
                  {t(`alignments.${alignment}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
      {columns !== null && (
        <button
          aria-label={t('resizeColumn', { column: label })}
          /* Dentro de su celda y por encima: medio fuera, la columna siguiente lo tapaba y no se podía tomar. */
          className="absolute inset-y-0 right-0 z-30 w-3 cursor-col-resize hover:bg-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
          data-testid="table-column-resize"
          onKeyDown={answerResizeKey}
          onPointerDown={startResizing}
          type="button"
        />
      )}
    </TableHead>
  );
};
