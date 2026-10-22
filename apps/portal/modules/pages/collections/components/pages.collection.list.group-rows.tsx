'use client';

import { useTranslations } from 'next-intl';
import { PAGE_VIRTUAL_LIST_ITEM_HEIGHT } from '../constants/pages.virtualization.constants';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionListRow } from './pages.collection.list.row';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';

interface IProps {
  readonly group: PageViewGroup;
  readonly isLoadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The rows of a list or of one group: only those in view once they are many, and the way to ask for more. */
export const PagesCollectionListGroupRows = ({
  group,
  isLoadingMore,
  onLoadMore,
  personOptions,
  properties,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const { rows } = group;
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
      {group.nextCursor !== null && group.nextCursor !== undefined && (
        <li className="list-none p-2">
          <PagesCollectionLoadMoreButton isLoading={isLoadingMore} onLoad={onLoadMore} />
        </li>
      )}
    </>
  );
};
