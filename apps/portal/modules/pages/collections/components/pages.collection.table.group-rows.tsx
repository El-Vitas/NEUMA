'use client';

import { useTranslations } from 'next-intl';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { PAGE_VIRTUAL_ROW_HEIGHT } from '../constants/pages.virtualization.constants';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
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
  readonly group: PageViewGroup;
  readonly isLoadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The rows of a table or of one group: only those in view once they are many, and the way to ask for more. */
export const PagesCollectionTableGroupRows = ({
  alignmentClasses,
  appearance,
  canEdit,
  collectionPageId,
  columnAppearances,
  columnCount,
  frozenCells,
  group,
  isLoadingMore,
  onLoadMore,
  personOptions,
  properties,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const { rows } = group;
  const [window, attachContainer] = usePagesWindowVirtualizer<HTMLTableRowElement>({
    count: rows.length,
    estimateSize: PAGE_VIRTUAL_ROW_HEIGHT,
  });
  const shown = window.indexes ?? rows.map((_row, position) => position);

  return (
    <>
      {/* Marks where the rows start on the page, so the window knows how far down they begin. */}
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
            scope={group.key}
            selectLabel={t('collection.selectRow', { title: row.title.length > 0 ? row.title : t('untitled') })}
            spaceId={spaceId}
            untitledLabel={t('untitled')}
          />
        );
      })}
      {window.after > 0 && <TableRow aria-hidden="true" className="border-0" style={{ height: window.after }} />}
      {group.nextCursor !== null && group.nextCursor !== undefined && (
        <TableRow data-testid="collection-load-more-row">
          <TableCell className="p-2" colSpan={columnCount}>
            <PagesCollectionLoadMoreButton isLoading={isLoadingMore} onLoad={onLoadMore} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
