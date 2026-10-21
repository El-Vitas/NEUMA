'use client';

import { useTranslations } from 'next-intl';
import { usePagesRowPaging } from '../hooks/use.pages.row-paging';
import type { PagesRowPagingInput } from '../types/pages.row-paging.types';
import type { PagePersonOption, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionGalleryCard } from './pages.collection.gallery.card';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';

interface IProps {
  readonly paging: PagesRowPagingInput;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The cards of a gallery after the first page, and the way to ask for the next ones. */
export const PagesCollectionGalleryMoreRows = ({ paging, personOptions, properties, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const { hasMore, isLoading, loadMore, rows } = usePagesRowPaging(paging);

  return (
    <>
      {rows.map((row) => (
        <PagesCollectionGalleryCard
          key={row.id}
          openFullPageLabel={t('sidePanel.openFullPage')}
          personOptions={personOptions}
          properties={properties}
          row={row}
          spaceId={spaceId}
          untitledLabel={t('untitled')}
        />
      ))}
      {hasMore && (
        <div className="col-span-full">
          <PagesCollectionLoadMoreButton isLoading={isLoading} onLoad={loadMore} />
        </div>
      )}
    </>
  );
};
