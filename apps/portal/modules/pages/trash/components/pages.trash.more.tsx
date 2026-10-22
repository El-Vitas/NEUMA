'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ListRowGroup } from '@/shared/components/ui/list-row-group';
import { isActionSuccess } from '@/shared/lib/action-result';
import { readTrashedPagesWindowAction } from '../server/actions/pages.trash.actions';
import type { TrashedPage, TrashedPagesListing } from '../types/pages.trash.types';
import { PagesTrashItem } from './pages.trash.item';

interface IProps {
  readonly canDeleteForever: boolean;
  /** How many the page already shows. */
  readonly loadedCount: number;
  readonly locale: string;
  readonly search: string;
  readonly total: number;
}

/** The pages past the first window, read when asked for; the page draws again from the first window after a change. */
export const PagesTrashMore = ({ canDeleteForever, loadedCount, locale, search, total }: IProps) => {
  const t = useTranslations('pages');
  const [isPending, startTransition] = useTransition();
  const [more, setMore] = useState<readonly TrashedPage[]>([]);
  const shown = loadedCount + more.length;

  const loadNext = (): void => {
    startTransition(async () => {
      const result = await readTrashedPagesWindowAction({
        search: search.length > 0 ? search : undefined,
        skip: shown,
      });
      if (isActionSuccess<TrashedPagesListing>(result)) setMore((current) => [...current, ...result.data.items]);
    });
  };

  return (
    <>
      {more.length > 0 && (
        <ListRowGroup ariaLabel={t('trash')}>
          {more.map((page) => (
            <PagesTrashItem canDeleteForever={canDeleteForever} key={page.id} locale={locale} page={page} />
          ))}
        </ListRowGroup>
      )}
      {shown < total && (
        <Button disabled={isPending} onClick={loadNext} type="button" variant="outline">
          {t('trashScreen.loadMore')}
        </Button>
      )}
    </>
  );
};
