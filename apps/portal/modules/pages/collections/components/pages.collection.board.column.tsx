'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { readPageOptionDotClass, readPageOptionSurfaceClass } from '../lib/pages.option-color.lib';
import type { PageBoardDragController } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionBoardCard } from './pages.collection.board.card';
import { PagesCollectionBoardNewCard } from './pages.collection.board.new-card';

interface IProps {
  /** La banda en la que está esta columna. Vacío cuando el tablero no tiene bandas. */
  readonly bandKey: string;
  readonly canDrag: boolean;
  readonly canEdit: boolean;
  readonly drag: PageBoardDragController;
  readonly group: PageViewGroup;
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
 */
export const PagesCollectionBoardColumn = ({
  bandKey,
  canDrag,
  canEdit,
  drag,
  group,
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
  const isAimingAt = (beforeRowId: null | string): boolean =>
    drag.target !== null &&
    drag.target.bandKey === bandKey &&
    drag.target.groupKey === group.key &&
    drag.target.beforeRowId === beforeRowId;
  const label = group.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : group.label;

  return (
    <section
      aria-label={label}
      className={cn('flex w-64 shrink-0 flex-col rounded-lg', readPageOptionSurfaceClass(group.color))}
      onDragLeave={() => drag.onDragLeave(group.key)}
      onDragOver={(event) => {
        if (!canDrag) return;
        event.preventDefault();
        drag.onDragOver({ bandKey, beforeRowId: null, groupKey: group.key });
      }}
      onDrop={(event) => {
        event.preventDefault();
        drag.onDrop();
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h3 className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1.5 rounded-sm bg-background/70 px-2 py-0.5 font-medium text-foreground">
            <span
              aria-hidden="true"
              className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))}
            />
            <span className="truncate">{label}</span>
          </span>
          <span className="text-muted-foreground tabular-nums">{group.rows.length}</span>
        </h3>
        {canEdit && (
          <Button
            aria-label={t('collection.newRowIn', { column: label })}
            className="size-8 text-muted-foreground hover:text-foreground"
            disabled={isCreating}
            onClick={onNameStart}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
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
          <PagesCollectionBoardNewCard
            columnLabel={label}
            disabled={isCreating}
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
