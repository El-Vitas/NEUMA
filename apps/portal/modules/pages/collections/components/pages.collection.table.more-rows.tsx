'use client';

import { useTranslations } from 'next-intl';
import { useContext, useEffect } from 'react';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { PAGE_LOADED_ROWS_CONTEXT } from '../constants/pages.row-context.constants';
import { PAGE_VIRTUAL_ROW_HEIGHT } from '../constants/pages.virtualization.constants';
import { usePagesRowPaging } from '../hooks/use.pages.row-paging';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PagesRowPagingInput } from '../types/pages.row-paging.types';
import type { PagePersonOption, PageSchemaProperty } from '../types/pages.schema.types';
import type { PageTableAppearance } from '../types/pages.table-appearance.types';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';
import { PagesCollectionTableRow } from './pages.collection.table.row';

interface IProps {
  readonly alignmentClasses: Readonly<Record<string, string>>;
  readonly appearance: PageTableAppearance;
  readonly canEdit: boolean;
  readonly collectionPageId: string;
  readonly columnAppearances: Readonly<Record<string, PageTableAppearance>>;
  readonly columnCount: number;
  readonly frozenCells: readonly { readonly className?: string; readonly style?: { readonly left: number } }[];
  readonly paging: PagesRowPagingInput;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  /** Which group these rows belong to, so the table can tell the rows of each apart. */
  readonly scope: string;
  readonly spaceId: string;
}

/** The rows after the first page of a table (or of one of its groups), and the way to ask for the next ones. */
export const PagesCollectionTableMoreRows = ({
  alignmentClasses,
  appearance,
  canEdit,
  collectionPageId,
  columnAppearances,
  columnCount,
  frozenCells,
  paging,
  personOptions,
  properties,
  scope,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const { report } = useContext(PAGE_LOADED_ROWS_CONTEXT);
  const { hasMore, isLoading, loadMore, rows } = usePagesRowPaging(paging);

  useEffect(() => {
    report(scope, rows);
    return () => report(scope, []);
  }, [report, rows, scope]);

  const [window, attachContainer] = usePagesWindowVirtualizer<HTMLTableRowElement>({
    count: rows.length,
    estimateSize: PAGE_VIRTUAL_ROW_HEIGHT,
  });
  const shown = window.indexes ?? rows.map((_row, position) => position);

  return (
    <>
      {/* Marks where the loaded rows start on the page, so the window knows how far down they begin. */}
      <TableRow aria-hidden="true" className="h-0 border-0 p-0" ref={attachContainer} />
      {window.before > 0 && <TableRow aria-hidden="true" className="border-0" style={{ height: window.before }} />}
      {shown.map((position) => {
        const row = rows[position];
        if (row === undefined) return null;
        return (
          <PagesCollectionTableRow
            alignmentClasses={alignmentClasses}
            appearance={appearance}
            canEdit={canEdit}
            collectionPageId={collectionPageId}
            columnAppearances={columnAppearances}
            frozenCells={frozenCells}
            index={window.indexes === null ? undefined : position}
            key={row.id}
            openFullPageLabel={t('sidePanel.openFullPage')}
            personOptions={personOptions}
            properties={properties}
            row={row}
            scope={scope}
            selectLabel={t('collection.selectRow', { title: row.title.length > 0 ? row.title : t('untitled') })}
            spaceId={spaceId}
            untitledLabel={t('untitled')}
          />
        );
      })}
      {window.after > 0 && <TableRow aria-hidden="true" className="border-0" style={{ height: window.after }} />}
      {hasMore && (
        <TableRow data-testid="collection-load-more-row">
          <TableCell className="p-2" colSpan={columnCount}>
            <PagesCollectionLoadMoreButton isLoading={isLoading} onLoad={loadMore} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
