'use client';

import { useTranslations } from 'next-intl';
import { PAGE_VIRTUAL_LIST_ITEM_HEIGHT } from '../constants/pages.virtualization.constants';
import { usePagesRowPaging } from '../hooks/use.pages.row-paging';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PagesRowPagingInput } from '../types/pages.row-paging.types';
import type { PagePersonOption, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionListRow } from './pages.collection.list.row';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';

interface IProps {
  readonly paging: PagesRowPagingInput;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The rows of a list after the first page, windowed once they are many, and the way to ask for the next ones. */
export const PagesCollectionListMoreRows = ({ paging, personOptions, properties, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const { hasMore, isLoading, loadMore, rows } = usePagesRowPaging(paging);
  const [window, attachContainer] = usePagesWindowVirtualizer<HTMLLIElement>({
    count: rows.length,
    estimateSize: PAGE_VIRTUAL_LIST_ITEM_HEIGHT,
  });
  const shown = window.indexes ?? rows.map((_row, position) => position);

  return (
    <>
      <li aria-hidden="true" className="m-0 h-0 list-none p-0" ref={attachContainer} />
      {window.before > 0 && <li aria-hidden="true" className="list-none" style={{ height: window.before }} />}
      {shown.map((position) => {
        const row = rows[position];
        if (row === undefined) return null;
        return (
          <PagesCollectionListRow
            index={window.indexes === null ? undefined : position}
            key={row.id}
            openFullPageLabel={t('sidePanel.openFullPage')}
            personOptions={personOptions}
            properties={properties}
            row={row}
            spaceId={spaceId}
            untitledLabel={t('untitled')}
          />
        );
      })}
      {window.after > 0 && <li aria-hidden="true" className="list-none" style={{ height: window.after }} />}
      {hasMore && (
        <li className="list-none p-2">
          <PagesCollectionLoadMoreButton isLoading={isLoading} onLoad={loadMore} />
        </li>
      )}
    </>
  );
};
