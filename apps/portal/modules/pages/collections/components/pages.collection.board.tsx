'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesBoardColumns } from '../hooks/use.pages.board-columns';
import { usePagesBoardDrag } from '../hooks/use.pages.board-drag';
import { usePagesEdgeScrolling } from '../hooks/use.pages.edge-scrolling';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageBoardColumnDrag, PageBoardNamingCell } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageSchema, PageSchemaProperty, PageViewBand } from '../types/pages.schema.types';
import { PagesCollectionBoardColumn } from './pages.collection.board.column';
import { PagesCollectionBoardNewColumn } from './pages.collection.board.new-column';

interface IProps {
  /** Cuál de las vistas de la colección es esta, que es de quien son las columnas plegadas y sus topes. */
  readonly activeViewName: string;
  /** Las filas en rejilla: una banda sin nombre cuando el tablero agrupa por una sola propiedad. */
  readonly bands: readonly PageViewBand[];
  readonly canEdit: boolean;
  readonly groupByKey: string;
  readonly personOptions?: readonly PagePersonOption[];
  /** What each card says besides its title, already narrowed to what this view shows. */
  readonly properties: readonly PageSchemaProperty[];
  /** La colección entera: de ella cuelgan las filas nuevas, y en ella viven las columnas. */
  readonly schema: PageSchema;
  readonly spaceId: string;
  /** La segunda propiedad por la que agrupa, o nada cuando el tablero es de una sola dimensión. */
  readonly subGroupByKey: string;
}

/**
 * Las filas de una colección como tarjetas en columnas, una columna por valor.
 *
 * Una columna crece con lo que lleva y es la página la que se desplaza. Darle
 * un alto propio con su barra dentro obliga a desplazar dos veces —la columna y
 * la página— para llegar a una tarjeta, y arrastrar entre dos columnas
 * desplazadas cada una por su lado deja de tener un arriba común.
 *
 * Con una segunda agrupación puesta, las mismas columnas se repiten dentro de
 * cada banda: la banda cruza el tablero entero para que una columna siga
 * estando debajo de su cabecera de una banda a la siguiente, y cada cruce sea
 * un sitio donde poner algo.
 */
export const PagesCollectionBoard = ({
  activeViewName,
  bands,
  canEdit,
  groupByKey,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  subGroupByKey,
}: IProps) => {
  const t = useTranslations('pages');
  const isBanded = subGroupByKey !== '';
  const drag = usePagesBoardDrag(bands, groupByKey, spaceId, subGroupByKey);
  const {
    onDragLeave: stopEdgeScrolling,
    onDragOver: scrollAtEdge,
    onDrop: dropAtEdge,
    surface,
  } = usePagesEdgeScrolling();
  const creation = usePagesRowCreation({
    bandedByKey: subGroupByKey,
    collectionPageId: schema.pageId,
    placedByKey: groupByKey,
    properties: schema.properties,
    spaceId,
  });
  const columns = usePagesBoardColumns(schema, groupByKey, activeViewName, spaceId);
  const [namingIn, setNamingIn] = useState<null | PageBoardNamingCell>(null);
  const [carriedColumn, setCarriedColumn] = useState<null | string>(null);
  const [columnTarget, setColumnTarget] = useState<null | string>(null);

  const columnDrag: PageBoardColumnDrag = {
    carried: carriedColumn,
    onDropOn: (beforeValue) => {
      const carried = carriedColumn;
      setCarriedColumn(null);
      setColumnTarget(null);
      if (carried !== null && carried !== beforeValue) columns.moveColumn(carried, beforeValue);
    },
    onEnd: () => {
      setCarriedColumn(null);
      setColumnTarget(null);
    },
    onOver: setColumnTarget,
    onStart: setCarriedColumn,
    target: columnTarget,
  };
  /**
   * Una columna solo se puede tocar cuando es una opción declarada. La de las
   * filas sin valor no es ninguna, y las de una fecha o un número tampoco: esas
   * salen de lo que las filas traen puesto, así que no hay nada que renombrar
   * ahí sin renombrar filas una por una.
   */
  const canCommandColumns =
    canEdit && (schema.properties.find((property) => property.key === groupByKey)?.options ?? null) !== null;
  const commandOf = (groupKey: string): null | PagesBoardColumns =>
    canCommandColumns && groupKey !== UNASSIGNED_GROUP_KEY ? columns : null;
  /**
   * Se esconde solo cuando no tiene nada: una columna escondida con filas dentro
   * sería esconder filas, y lo que se pidió fue no ver una columna que sobra.
   *
   * Esconder todas las vacías se paga con un sitio menos donde soltar una
   * tarjeta, así que la columna que se está usando ahora mismo —la de la tarjeta
   * en el aire— se queda a la vista aunque esté vacía.
   */
  const isShown = (group: { readonly key: string; readonly rows: readonly unknown[] }): boolean => {
    if (group.rows.length > 0 || drag.draggingRowId !== null) return true;
    if (group.key === UNASSIGNED_GROUP_KEY && columns.hidesUnassignedColumn) return false;
    return !columns.hidesEmptyGroups;
  };

  const createNamed = (bandKey: string, groupKey: string, title: string): void => {
    setNamingIn(null);
    creation.createRowIn(groupKey, title, bandKey);
  };

  return (
    <>
      <output aria-live="polite" className="sr-only">
        {drag.announcement}
      </output>
      {/*
        El tablero se sale del margen del cuerpo y llega hasta el borde: columnas
        encajonadas en el ancho de un párrafo obligan a desplazar por cuatro que
        cabrían. El margen se devuelve por dentro para que la primera columna no
        quede pegada al borde.
      */}
      <section
        aria-label={t('collection.boardColumns')}
        className="-mx-4 space-y-4 overflow-x-auto px-4 pb-3 sm:-mr-6 sm:-ml-14 sm:pr-6 sm:pl-14 lg:-mr-8 lg:-ml-16 lg:pr-8 lg:pl-16 xl:-mr-10 xl:pr-10"
        data-testid="collection-board"
        /* Arrastrar contra el borde desplaza el tablero: sin esto, llevar una tarjeta a una columna que no se ve son tres gestos. */
        onDragLeave={stopEdgeScrolling}
        onDragOver={scrollAtEdge}
        onDrop={dropAtEdge}
        ref={surface}
      >
        {(isBanded ? drag.bands : drag.bands.slice(0, 1)).map((band) => (
          <section aria-label={isBanded ? band.label : undefined} data-testid="collection-board-band" key={band.key}>
            {isBanded && (
              <h3 className="flex items-center gap-2 pb-2 font-medium text-foreground text-sm">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(band.color))}
                />
                {band.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : band.label}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {band.groups.reduce((total, group) => total + group.rows.length, 0)}
                </span>
              </h3>
            )}
            <div className="flex items-start gap-3">
              {band.groups.filter(isShown).map((group) => (
                <PagesCollectionBoardColumn
                  bandKey={band.key}
                  canDrag={canEdit}
                  canEdit={canEdit}
                  columnDrag={columnDrag}
                  columns={commandOf(group.key)}
                  drag={drag}
                  group={group}
                  isCollapsed={columns.collapsedColumns.includes(group.key)}
                  isCreating={creation.isCreating}
                  isNaming={namingIn?.bandKey === band.key && namingIn.groupKey === group.key}
                  key={group.key}
                  onCreate={(title) => createNamed(band.key, group.key, title)}
                  onNameCancel={() => setNamingIn(null)}
                  onNameStart={() => setNamingIn({ bandKey: band.key, groupKey: group.key })}
                  personOptions={personOptions}
                  properties={properties}
                  spaceId={spaceId}
                />
              ))}
              {/* Una sola vez, en la primera banda: la columna nueva es de todas, no de esta franja. */}
              {canCommandColumns && band.key === drag.bands[0]?.key && (
                <div className="flex shrink-0 flex-col items-start gap-1">
                  {/* Soltar sobre él es soltar al final: no hay ninguna columna a la derecha ante la cual caer. */}
                  <PagesCollectionBoardNewColumn
                    disabled={columns.isBusy}
                    isCarryingColumn={carriedColumn !== null}
                    isColumnTarget={carriedColumn !== null && columnTarget === null}
                    onAdd={columns.addColumn}
                    onColumnDrop={() => columnDrag.onDropOn(null)}
                    onColumnOver={() => columnDrag.onOver(null)}
                  />
                  <Button
                    className="w-40 justify-start rounded-lg text-muted-foreground text-xs hover:text-foreground"
                    data-testid="board-toggle-unassigned"
                    disabled={columns.isBusy}
                    onClick={columns.toggleUnassignedColumn}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {columns.hidesUnassignedColumn ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {t(columns.hidesUnassignedColumn ? 'collection.showUnassigned' : 'collection.hideUnassigned')}
                  </Button>
                </div>
              )}
            </div>
          </section>
        ))}
      </section>
    </>
  );
};
