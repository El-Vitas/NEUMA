'use client';

import { PAGE_COLLECTION_TITLE_PROPERTY_KEY } from '@neuma/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Table, TableHeader, TableRow } from '@/shared/components/ui/table';
import { PAGE_ROW_ORDERING_CONTEXT } from '../constants/pages.row-context.constants';
import { usePagesRowOrdering } from '../hooks/use.pages.row-ordering';
import { usePagesTableColumns } from '../hooks/use.pages.table-columns';
import {
  listTableColumnKeys,
  readColumnLabel,
  readTableColumnLabelId,
  readTableColumnOffsets,
  readTableColumnWidth,
  readTableFrozenCellProps,
} from '../lib/pages.table-columns.lib';
import type {
  PagePersonOption,
  PagePropertyValues,
  PageSchema,
  PageSchemaProperty,
  PageViewAggregates,
} from '../types/pages.schema.types';
import { PagesCollectionSelectionProvider } from './pages.collection.selection.provider';
import { PagesCollectionSelectionBar } from './pages.collection.selection-bar';
import { PagesCollectionTableAppearance } from './pages.collection.table.appearance';
import { PagesCollectionTableHeaderCell } from './pages.collection.table.header-cell';
import { PagesCollectionTableSelectAll } from './pages.collection.table.select-all';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly canEdit: boolean;
  readonly children: ReactNode;
  /** Whether the rows can be put in another place by hand: the view follows its own order and the reader may edit. */
  readonly isOrderable: boolean;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly rowIds: readonly string[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly titleLabel: string;
  readonly valuesByRow: Readonly<Record<string, PagePropertyValues>>;
  readonly viewId: string;
}

/**
 * Widths travel through `colgroup`, not each cell, so a column measures the same above and below while resized.
 * The table states its total width: otherwise the browser stretches it and gives the surplus to the last column.
 */
export const PagesCollectionTableHeader = ({
  activeViewName,
  aggregates,
  canEdit,
  children,
  isOrderable,
  personOptions,
  properties,
  rowIds,
  schema,
  spaceId,
  titleLabel,
  valuesByRow,
  viewId,
}: IProps) => {
  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  const columns = usePagesTableColumns(schema, activeViewName, columnKeys.slice(1), spaceId);
  const ordering = usePagesRowOrdering(schema.pageId, spaceId, viewId);
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
    <PagesCollectionSelectionProvider>
      <PAGE_ROW_ORDERING_CONTEXT value={isOrderable ? ordering : null}>
        <div className="mb-1 flex items-center justify-end gap-2">
          {canEdit && <PagesCollectionTableAppearance columns={columns} />}
        </div>
        {canEdit && (
          <PagesCollectionSelectionBar
            aggregates={aggregates}
            pageId={schema.pageId}
            personOptions={personOptions}
            properties={properties}
            spaceId={spaceId}
            valuesByRow={valuesByRow}
            viewId={viewId}
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
      </PAGE_ROW_ORDERING_CONTEXT>
    </PagesCollectionSelectionProvider>
  );
};
