'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesBoardDrag } from '../hooks/use.pages.board-drag';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PageBoardNamingCell } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageSchemaProperty, PageViewBand } from '../types/pages.schema.types';
import { PagesCollectionBoardColumn } from './pages.collection.board.column';

interface IProps {
  /** Las filas en rejilla: una banda sin nombre cuando el tablero agrupa por una sola propiedad. */
  readonly bands: readonly PageViewBand[];
  readonly canEdit: boolean;
  /** La página que lleva la colección, que es de quien cuelgan las filas nuevas. */
  readonly collectionPageId: string;
  readonly groupByKey: string;
  readonly personOptions?: readonly PagePersonOption[];
  /** What each card says besides its title, already narrowed to what this view shows. */
  readonly properties: readonly PageSchemaProperty[];
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
  bands,
  canEdit,
  collectionPageId,
  groupByKey,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  spaceId,
  subGroupByKey,
}: IProps) => {
  const t = useTranslations('pages');
  const isBanded = subGroupByKey !== '';
  const drag = usePagesBoardDrag(bands, groupByKey, spaceId, subGroupByKey);
  const creation = usePagesRowCreation(collectionPageId, groupByKey, spaceId, subGroupByKey);
  const [namingIn, setNamingIn] = useState<null | PageBoardNamingCell>(null);

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
      <div
        className="-mx-4 space-y-4 overflow-x-auto px-4 pb-3 sm:-mr-6 sm:-ml-14 sm:pr-6 sm:pl-14 lg:-mr-8 lg:-ml-16 lg:pr-8 lg:pl-16 xl:-mr-10 xl:pr-10"
        data-testid="collection-board"
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
              {band.groups.map((group) => (
                <PagesCollectionBoardColumn
                  bandKey={band.key}
                  canDrag={canEdit}
                  canEdit={canEdit}
                  drag={drag}
                  group={group}
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
            </div>
          </section>
        ))}
      </div>
    </>
  );
};
