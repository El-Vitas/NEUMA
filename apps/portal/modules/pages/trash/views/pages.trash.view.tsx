import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { PagesTrashEmptyTrashDialog } from '../components/pages.trash.empty-trash.dialog';
import { PagesTrashList } from '../components/pages.trash.list';
import { PagesTrashRetry } from '../components/pages.trash.retry';
import { PagesTrashSearchForm } from '../components/pages.trash.search.form';
import type { TrashedPage } from '../types/pages.trash.types';

interface IProps {
  /** Only an administrator deletes forever; everyone else trashes and restores. */
  readonly canDeleteForever: boolean;
  readonly items: null | readonly TrashedPage[];
  readonly search: string;
}

export const PagesTrashView = async ({ canDeleteForever, items, search }: IProps) => {
  const t = await getTranslations('pages');
  const hasUnscheduledPages = items?.some((page) => page.purgeAfter === null) ?? false;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <PageHeader
        action={items !== null && canDeleteForever && <PagesTrashEmptyTrashDialog disabled={!hasUnscheduledPages} />}
        subtitle={t(canDeleteForever ? 'trashScreen.description' : 'trashScreen.descriptionRestoreOnly')}
        title={t('trash')}
      />
      {items === null ? (
        <PagesTrashRetry />
      ) : (
        <>
          <PagesTrashSearchForm initialSearch={search} />
          <PagesTrashList canDeleteForever={canDeleteForever} items={items} search={search} />
        </>
      )}
    </main>
  );
};
