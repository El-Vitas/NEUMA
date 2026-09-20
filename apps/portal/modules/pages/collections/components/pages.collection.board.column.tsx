'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { readPageOptionDotClass, readPageOptionSurfaceClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type {
  PageBoardColumnDrag,
  PageBoardColumnMode,
  PageBoardDragController,
} from '../types/pages.board-drag.types';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionBoardCard } from './pages.collection.board.card';
import { PagesCollectionBoardColumnHeader } from './pages.collection.board.column-header';
import { PagesCollectionBoardColumnRemoveDialog } from './pages.collection.board.column-remove.dialog';
import { PagesCollectionNewRow } from './pages.collection.new-row';

interface IProps {
  /** La banda en la que está esta columna. Vacío cuando el tablero no tiene bandas. */
  readonly bandKey: string;
  readonly canDrag: boolean;
  readonly canEdit: boolean;
  /** El gesto de llevar una columna de sitio, que no es el de llevar una tarjeta. */
  readonly columnDrag: PageBoardColumnDrag;
  /** Qué se puede hacer con la columna misma. Nada cuando la columna no es un valor que se pueda tocar. */
  readonly columns: null | PagesBoardColumns;
  readonly drag: PageBoardDragController;
  readonly group: PageViewGroup;
  readonly isCollapsed: boolean;
  readonly isCreating: boolean;
  readonly isNaming: boolean;
  readonly onCreate: (title: string) => void;
  readonly onNameCancel: () => void;
  readonly onNameStart: () => void;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/**
 * Una columna del tablero: un valor de la propiedad que agrupa, con lo que le
 * tocó dentro.
 *
 * Se queda aunque esté vacía, porque una columna vacía es un sitio donde soltar
 * y una ausente no. Y es la misma pieza esté sola o dentro de una banda: una
 * rejilla no es otra clase de tablero, son las mismas columnas repetidas por
 * cada valor del segundo agrupamiento.
 *
 * Plegada se queda en una franja que sigue diciendo cómo se llama y cuántas
 * lleva: plegar es dejar de mirar dentro, no dejar de saber que está.
 */
export const PagesCollectionBoardColumn = ({
  bandKey,
  canDrag,
  canEdit,
  columnDrag,
  columns,
  drag,
  group,
  isCollapsed,
  isCreating,
  isNaming,
  onCreate,
  onNameCancel,
  onNameStart,
  personOptions,
  properties,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const [mode, setMode] = useState<PageBoardColumnMode>('NAMED');
  /** Con una columna en la mano no hay huecos entre tarjetas que señalar: lo que se mueve es otra cosa. */
  const isAimingAt = (beforeRowId: null | string): boolean =>
    columnDrag.carried === null &&
    drag.target !== null &&
    drag.target.bandKey === bandKey &&
    drag.target.groupKey === group.key &&
    drag.target.beforeRowId === beforeRowId;
  const label = group.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : group.label;
  const limit = columns?.limits[group.key] ?? null;
  const isOverLimit = limit !== null && group.rows.length > limit;

  const renameTo = (name: string): void => {
    setMode('NAMED');
    if (name.trim() !== '' && name !== group.key) columns?.renameColumn(group.key, name.trim());
  };

  if (isCollapsed) {
    return (
      /*
        Plegada sigue siendo un sitio donde dejar otra columna: si no, una
        columna doblada partiría el tablero en dos mitades entre las que no se
        puede pasar nada.
      */
      <button
        aria-label={t('collection.unfoldColumnNamed', { column: label })}
        className={cn(
          'flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg py-3',
          readPageOptionSurfaceClass(group.color),
          columnDrag.carried === group.key && 'opacity-50',
          columnDrag.carried !== null && columnDrag.target === group.key && 'ring-2 ring-primary',
        )}
        data-testid="board-column-collapsed"
        onClick={() => columns?.toggleCollapsed(group.key)}
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
  }

  return (
    <section
      aria-label={label}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-lg',
        readPageOptionSurfaceClass(group.color),
        columnDrag.carried === group.key && 'opacity-50',
        columnDrag.carried !== null && columnDrag.target === group.key && 'ring-2 ring-primary',
      )}
      data-testid="board-column"
      onDragLeave={() => drag.onDragLeave(group.key)}
      /*
        Lo que se está llevando decide qué se ofrece: con una columna en la mano,
        el tablero ofrece huecos entre columnas y no entre tarjetas, y mezclar
        las dos cosas haría que soltar signifique dos cosas a la vez.
      */
      onDragOver={(event) => {
        if (columnDrag.carried !== null) {
          event.preventDefault();
          columnDrag.onOver(group.key);
          return;
        }
        if (!canDrag) return;
        event.preventDefault();
        drag.onDragOver({ bandKey, beforeRowId: null, groupKey: group.key });
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (columnDrag.carried !== null) {
          columnDrag.onDropOn(group.key);
          return;
        }
        drag.onDrop();
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <PagesCollectionBoardColumnHeader
          canEdit={canEdit}
          columns={columns}
          group={group}
          isCreating={isCreating}
          label={label}
          limit={limit}
          mode={mode}
          onCollapse={() => columns?.toggleCollapsed(group.key)}
          onDragEnd={columnDrag.onEnd}
          onDragStart={() => columnDrag.onStart(group.key)}
          onLimit={(asked) => columns?.setLimit(group.key, asked)}
          onModeChange={setMode}
          onNameStart={onNameStart}
          onRename={renameTo}
        />
      </div>
      {/* Lo dice, y deja soltar igual: un tope es lo que se esperaba, no una puerta. */}
      {isOverLimit && (
        <p className="px-3 pb-2 text-muted-foreground text-xs" data-testid="board-column-over-limit">
          {t('collection.columnOverLimit', { limit })}
        </p>
      )}
      {mode === 'REMOVING' && columns !== null && (
        <PagesCollectionBoardColumnRemoveDialog
          isBusy={columns.isBusy}
          label={label}
          onClose={() => setMode('NAMED')}
          onConfirm={() => {
            setMode('NAMED');
            columns.removeColumn(group.key);
          }}
          rowCount={group.rows.length}
        />
      )}
      <div className="px-2 pb-2">
        {group.rows.length === 0 && (
          <p className="px-1 py-2 text-muted-foreground text-xs">{t('collection.emptyColumn')}</p>
        )}
        {group.rows.map((row, position) => (
          <div key={row.id}>
            <div
              aria-hidden="true"
              className={cn('h-0.5 rounded-full transition-colors', isAimingAt(row.id) && 'bg-primary')}
              data-active={isAimingAt(row.id)}
              data-testid="board-drop-gap"
            />
            <PagesCollectionBoardCard
              bandKey={bandKey}
              canEdit={canDrag}
              drag={drag}
              groupKey={group.key}
              isCarryingColumn={columnDrag.carried !== null}
              nextRowId={group.rows[position + 1]?.id ?? null}
              personOptions={personOptions}
              properties={properties}
              row={row}
              spaceId={spaceId}
            />
          </div>
        ))}
        <div
          aria-hidden="true"
          className={cn(
            'mt-1 h-0.5 rounded-full transition-colors',
            isAimingAt(null) && group.rows.length > 0 && 'bg-primary',
          )}
        />
        {isNaming && (
          <PagesCollectionNewRow
            disabled={isCreating}
            label={t('collection.newRowIn', { column: label })}
            onCancel={onNameCancel}
            onConfirm={onCreate}
          />
        )}
        {canEdit && !isNaming && (
          <Button
            className="mt-1 w-full justify-start rounded-md text-muted-foreground hover:text-foreground"
            disabled={isCreating}
            onClick={onNameStart}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('collection.newRow')}
          </Button>
        )}
      </div>
    </section>
  );
};
