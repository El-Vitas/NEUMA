import { getLocale, getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ListRowGroup } from '@/shared/components/ui/list-row-group';
import type { TrashedPage } from '../types/pages.trash.types';
import { PagesTrashItem } from './pages.trash.item';

interface IProps {
  readonly canDeleteForever: boolean;
  readonly items: readonly TrashedPage[];
  readonly search: string;
}

export const PagesTrashList = async ({ canDeleteForever, items, search }: IProps) => {
  const t = await getTranslations('pages');
  const locale = await getLocale();

  if (items.length === 0) {
    const message =
      search.trim().length > 0 ? t('trashScreen.noSearchResults', { query: search }) : t('trashScreen.empty');
    return <EmptyState message={message} />;
  }

  return (
    <ListRowGroup ariaLabel={t('trash')}>
      {items.map((page) => (
        <PagesTrashItem canDeleteForever={canDeleteForever} key={page.id} locale={locale} page={page} />
      ))}
    </ListRowGroup>
  );
};
