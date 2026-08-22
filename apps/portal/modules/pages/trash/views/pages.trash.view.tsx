import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { PagesTrashEmptyTrashDialog } from '../components/pages.trash.empty-trash.dialog';
import { PagesTrashList } from '../components/pages.trash.list';
import { PagesTrashRetry } from '../components/pages.trash.retry';
import { PagesTrashSearchForm } from '../components/pages.trash.search.form';
import type { TrashedPage } from '../types/pages.trash.types';

interface IProps {
  readonly items: null | readonly TrashedPage[];
  readonly search: string;
}

export const PagesTrashView = async ({ items, search }: IProps) => {
  const t = await getTranslations('pages');

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <PageHeader
        action={items !== null && <PagesTrashEmptyTrashDialog disabled={items.length === 0} />}
        subtitle={t('trashScreen.description')}
        title={t('trash')}
      />
      {items === null ? (
        <PagesTrashRetry />
      ) : (
        <>
          <PagesTrashSearchForm initialSearch={search} />
          <PagesTrashList items={items} search={search} />
        </>
      )}
    </main>
  );
};
