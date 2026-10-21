'use client';

import { PAGE_COLLECTION_TITLE_PROPERTY_KEY } from '@neuma/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Table, TableHeader, TableRow } from '@/shared/components/ui/table';
import { usePagesTableColumns } from '../hooks/use.pages.table-columns';
import {
  listTableColumnKeys,
  readColumnLabel,
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
  readonly children: ReactNode;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly rowIds: readonly string[];
  readonly searchTexts: readonly string[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly titleLabel: string;
  readonly valuesByRow: Readonly<Record<string, PagePropertyValues>>;
}

/**
 * Widths travel through `colgroup`, not each cell, so a column measures the same above and below while resized.
 * The table states its total width: otherwise the browser stretches it and gives the surplus to the last column.
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

  /** The width being dragged wins over the saved one so the edge follows the pointer. */
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
                      : readColumnLabel(properties[position - 1], columnKey)
                  }
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
