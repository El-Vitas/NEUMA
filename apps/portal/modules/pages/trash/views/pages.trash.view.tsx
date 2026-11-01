import { getLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { PagesTrashEmptyTrashDialog } from '../components/pages.trash.empty-trash.dialog';
import { PagesTrashList } from '../components/pages.trash.list';
import { PagesTrashMore } from '../components/pages.trash.more';
import { PagesTrashRetry } from '../components/pages.trash.retry';
import { PagesTrashSearchForm } from '../components/pages.trash.search.form';
import type { TrashedPagesListing } from '../types/pages.trash.types';

interface IProps {
  /** Only an administrator deletes forever; everyone else trashes and restores. */
  readonly canDeleteForever: boolean;
  readonly listing: null | TrashedPagesListing;
  readonly search: string;
}

export const PagesTrashView = async ({ canDeleteForever, listing, search }: IProps) => {
  const [t, locale] = await Promise.all([getTranslations('pages'), getLocale()]);
  const hasUnscheduledPages = listing?.items.some((page) => page.purgeAfter === null) ?? false;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <PageHeader
        action={listing !== null && canDeleteForever && <PagesTrashEmptyTrashDialog disabled={!hasUnscheduledPages} />}
        subtitle={t(canDeleteForever ? 'trashScreen.description' : 'trashScreen.descriptionRestoreOnly')}
        title={t('trash')}
      />
      {listing === null ? (
        <PagesTrashRetry />
      ) : (
        <>
          <PagesTrashSearchForm initialSearch={search} />
          <PagesTrashList canDeleteForever={canDeleteForever} items={listing.items} search={search} />
          <PagesTrashMore
            canDeleteForever={canDeleteForever}
            key={`${search}:${listing.items.map((page) => page.id).join(',')}`}
            loadedCount={listing.items.length}
            locale={locale}
            search={search}
            total={listing.total}
          />
        </>
      )}
    </main>
  );
};
