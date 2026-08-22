'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { buildPageTrashUrl } from '../lib/pages.trash.lib';

interface IProps {
  readonly initialSearch: string;
}

export const PagesTrashSearchForm = ({ initialSearch }: IProps) => {
  const t = useTranslations('pages');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const submitSearch = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    router.push(buildPageTrashUrl(search));
  };

  return (
    <form
      aria-label={t('trashScreen.searchLabel')}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={submitSearch}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="trash-search">{t('trashScreen.searchLabel')}</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="min-h-11 pl-9 text-base"
            id="trash-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('trashScreen.searchPlaceholder')}
            type="search"
            value={search}
          />
        </div>
      </div>
      <Button className="min-h-11 w-full sm:w-auto" type="submit" variant="outline">
        {tCommon('search')}
      </Button>
    </form>
  );
};
