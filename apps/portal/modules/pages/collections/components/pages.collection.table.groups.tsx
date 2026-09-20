'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { TableBody, TableCell, TableRow } from '@/shared/components/ui/table';
import { usePagesGroupCollapsing } from '../hooks/use.pages.group-collapsing';
import { usePagesGroupOrdering } from '../hooks/use.pages.group-ordering';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PageSchema, PageTableGroup } from '../types/pages.schema.types';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /** Cuántas columnas tiene la tabla, para que la franja las cruce entera. */
  readonly columnCount: number;
  /** Por qué propiedad agrupa la vista, que es de quien son los valores que hacen los grupos. */
  readonly groupByKey: string;
  readonly groups: readonly PageTableGroup[];
  /** Si los grupos sin ninguna fila se dejan fuera, tal como lo pidió esta vista. */
  readonly hidesEmptyGroups: boolean;
  /** Sin agrupar hay un solo grupo sin nombre, y entonces no hay franja que poner. */
  readonly isGrouped: boolean;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/**
 * Los grupos de la tabla, cada uno con la franja que lo abre.
 *
 * La franja cruza la tabla entera porque no pertenece a ninguna columna: dice de
 * qué es este montón de filas y cuántas son. Tocarla lo pliega, y plegado sigue
 * diciendo las dos cosas — plegar es dejar de mirar dentro, no dejar de saber
 * que está.
 *
 * Los lleva a todos una sola pieza y no una por grupo: lo plegado es una lista, y
 * con una copia por franja la segunda que se tocara mandaría una lista que no
 * sabe de la primera, borrándola.
 */
export const PagesCollectionTableGroups = ({
  activeViewName,
  canEdit,
  columnCount,
  groupByKey,
  groups,
  hidesEmptyGroups,
  isGrouped,
  schema,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const collapsing = usePagesGroupCollapsing(schema, activeViewName, spaceId);
  const ordering = usePagesGroupOrdering(schema, groupByKey, spaceId);

  const labelOf = (group: PageTableGroup): string =>
    group.key === UNASSIGNED_GROUP_KEY ? t('unassignedGroup') : group.label;

  if (!isGrouped) return groups.map((group) => <TableBody key={group.key}>{group.rows}</TableBody>);

  const shown = groups.filter((group) => !hidesEmptyGroups || group.rowCount > 0);
  /**
   * Entre los que se pueden mover, no entre todos: el de las filas sin valor va
   * siempre al final y no es un valor declarado, así que el último grupo que sí
   * lo es ya no tiene ninguno debajo al que adelantar.
   */
  const movable = shown.filter((group) => ordering.canMove(group.key)).map((group) => group.key);

  return shown.map((group) => (
    <TableBody key={group.key}>
      <TableRow className="bg-muted/40 hover:bg-muted/60" data-testid="collection-table-group">
        <TableCell className="p-0" colSpan={columnCount}>
          <div className="flex min-h-11 items-center gap-1 pr-2">
            <button
              aria-expanded={!collapsing.isCollapsed(group.key)}
              className="flex min-h-11 flex-1 items-center gap-2 px-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => collapsing.toggle(group.key)}
              type="button"
            >
              {collapsing.isCollapsed(group.key) ? (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))}
              />
              <span className="truncate font-medium text-foreground">{labelOf(group)}</span>
              <span className="text-muted-foreground tabular-nums">{group.rowCount}</span>
            </button>
            {/*
              Con botones y no arrastrando la franja entera: una franja cruza la
              tabla de lado a lado, así que arrastrarla no apunta a ningún sitio
              —no hay un «antes de esta» que se vea— y además es lo que se toca
              para plegarla.
            */}
            {canEdit && ordering.canMove(group.key) && (
              <>
                <Button
                  aria-label={t('moveGroupEarlier', { group: labelOf(group) })}
                  className="size-9 text-muted-foreground hover:text-foreground"
                  disabled={ordering.isBusy || movable.indexOf(group.key) === 0}
                  onClick={() => ordering.move(group.key, 'EARLIER')}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={t('moveGroupLater', { group: labelOf(group) })}
                  className="size-9 text-muted-foreground hover:text-foreground"
                  disabled={ordering.isBusy || movable.indexOf(group.key) === movable.length - 1}
                  onClick={() => ordering.move(group.key, 'LATER')}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {!collapsing.isCollapsed(group.key) && group.rows}
    </TableBody>
  ));
};
