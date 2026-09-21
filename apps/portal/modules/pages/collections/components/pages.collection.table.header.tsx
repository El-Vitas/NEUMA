'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Table, TableHeader, TableRow } from '@/shared/components/ui/table';
import { PAGE_COLLECTION_TITLE_PROPERTY_KEY } from '../constants/pages.collections.constants';
import { usePagesTableColumns } from '../hooks/use.pages.table-columns';
import {
  listTableColumnKeys,
  readTableColumnLabelId,
  readTableColumnOffsets,
  readTableColumnWidth,
  readTableFrozenCellProps,
} from '../lib/pages.table-columns.lib';
import type { PagePersonOption, PagePropertyValues, PageSchema, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionSearchProvider } from './pages.collection.search.provider';
import { PagesCollectionSearchEmpty } from './pages.collection.search-empty';
import { PagesCollectionSearchField } from './pages.collection.search-field';
import { PagesCollectionSelectionProvider } from './pages.collection.selection.provider';
import { PagesCollectionSelectionBar } from './pages.collection.selection-bar';
import { PagesCollectionTableAppearance } from './pages.collection.table.appearance';
import { PagesCollectionTableHeaderCell } from './pages.collection.table.header-cell';
import { PagesCollectionTableSelectAll } from './pages.collection.table.select-all';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /** Las filas y el pie, ya dibujados por el servidor: aquí solo se los enmarca. */
  readonly children: ReactNode;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  /** Las filas que se están viendo, que son las que marca la casilla de arriba. */
  readonly rowIds: readonly string[];
  /** Lo que dice cada fila en palabras, para el buscador de la colección. */
  readonly searchTexts: readonly string[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly titleLabel: string;
  /** Lo que cada fila responde ahora, para poder devolverla a eso si se deshace lo hecho en bloque. */
  readonly valuesByRow: Readonly<Record<string, PagePropertyValues>>;
}

/**
 * La tabla entera medida por sus columnas.
 *
 * El ancho viaja por `colgroup` y no por cada celda: así una columna mide lo
 * mismo arriba que abajo mientras se la estira, sin que el cuerpo tenga que
 * saber nada de lo que está pasando con el ratón. Y la tabla lleva escrito
 * cuánto suman: sin eso el navegador la estira hasta su marco y le regala el
 * sobrante a la última columna, que entonces deja de medir lo que se le dijo.
 *
 * Lo que se queda quieto al desplazarse sí se dice celda por celda, porque
 * pegarse al borde es de cada una; el sitio donde se pega se calcula con los
 * anchos ya guardados, para que cabecera y cuerpo coincidan siempre.
 */
export const PagesCollectionTableHeader = ({
  activeViewName,
  canEdit,
  children,
  personOptions,
  properties,
  rowIds,
  schema,
  searchTexts,
  spaceId,
  titleLabel,
  valuesByRow,
}: IProps) => {
  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  const columns = usePagesTableColumns(schema, activeViewName, columnKeys.slice(1), spaceId);
  const [stretching, setStretching] = useState<null | { readonly columnKey: string; readonly width: number }>(null);
  const [carried, setCarried] = useState<null | string>(null);

  /** El que se está arrastrando ahora mismo manda sobre el guardado, para que el borde siga a la mano. */
  const widthOf = (columnKey: string): number =>
    stretching !== null && stretching.columnKey === columnKey
      ? stretching.width
      : readTableColumnWidth(columns.widths, columnKey);
  const offsets = readTableColumnOffsets(columnKeys, columns.widths);

  const dropOn = (beforeKey: null | string): void => {
    const taken = carried;
    setCarried(null);
    if (taken !== null && taken !== beforeKey) columns.moveColumn(taken, beforeKey);
  };

  const total = columnKeys.reduce((sum, columnKey) => sum + widthOf(columnKey), 0);

  return (
    <PagesCollectionSearchProvider searchTexts={searchTexts}>
      <PagesCollectionSelectionProvider>
        {/*
        Buscar y cómo se ve la tabla van juntos sobre ella: las dos cosas se
        deciden mirándola, y ninguna cambia lo que la colección guarda.
      */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <PagesCollectionSearchField />
          {canEdit && <PagesCollectionTableAppearance columns={columns} />}
        </div>
        {canEdit && (
          <PagesCollectionSelectionBar
            personOptions={personOptions}
            properties={properties}
            spaceId={spaceId}
            valuesByRow={valuesByRow}
          />
        )}
        <Table className="table-fixed" data-testid="collection-table" style={{ width: total }}>
          <colgroup>
            {columnKeys.map((columnKey) => (
              <col key={columnKey} style={{ width: widthOf(columnKey) }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {columnKeys.map((columnKey, position) => (
                <PagesCollectionTableHeaderCell
                  columnKey={columnKey}
                  columns={canEdit ? columns : null}
                  frozen={readTableFrozenCellProps(position, columns.frozenColumns, offsets)}
                  headerId={readTableColumnLabelId(schema.pageId, columnKey)}
                  key={columnKey}
                  label={
                    columnKey === PAGE_COLLECTION_TITLE_PROPERTY_KEY
                      ? titleLabel
                      : (properties[position - 1]?.label ?? columnKey)
                  }
                  /* La casilla de marcar todo va con el nombre, que es la columna que abre cada fila. */
                  leading={
                    canEdit && columnKey === PAGE_COLLECTION_TITLE_PROPERTY_KEY ? (
                      <PagesCollectionTableSelectAll rowIds={rowIds} />
                    ) : null
                  }
                  movable={columnKey !== PAGE_COLLECTION_TITLE_PROPERTY_KEY}
                  onDragEnd={() => setCarried(null)}
                  onDragOver={() => undefined}
                  onDragStart={() => setCarried(columnKey)}
                  onDrop={() => dropOn(columnKey)}
                  onResize={(width) => setStretching({ columnKey, width })}
                  onResizeEnd={(width) => {
                    setStretching(null);
                    columns.setWidth(columnKey, width);
                  }}
                  position={position}
                  width={widthOf(columnKey)}
                />
              ))}
            </TableRow>
          </TableHeader>
          {children}
        </Table>
        <PagesCollectionSearchEmpty />
      </PagesCollectionSelectionProvider>
    </PagesCollectionSearchProvider>
  );
};
