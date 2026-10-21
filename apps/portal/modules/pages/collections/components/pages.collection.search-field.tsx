'use client';

import type { PageFilter } from '@neuma/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';

interface IProps {
  readonly activeViewName: string;
  /** Kept in the address when the words change. */
  readonly quickFilter: null | PageFilter;
  /** The words the server is filtering the rows by right now. */
  readonly search: string;
}

/**
 * The server reads the rows, so searching asks it again: the words go in the address and the view is read with them.
 * Rows, counts and the next pages then agree on what matches, instead of the screen filtering only what it has loaded.
 */
export const PagesCollectionSearchField = ({ activeViewName, quickFilter, search }: IProps) => {
  const t = useTranslations('pages.collection');
  const router = useRouter();
  const [typed, setTyped] = useState(search);
  const [wasSearching, setWasSearching] = useState(search);
  const [isReading, startReading] = useTransition();

  if (wasSearching !== search) {
    setWasSearching(search);
    setTyped(search);
  }

  const searchFor = (words: string): void =>
    startReading(() =>
      router.replace(buildCollectionViewHref(activeViewName, { quickFilter, search: words }), { scroll: false }),
    );

  return (
    <search className="flex items-center gap-1">
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          searchFor(typed);
        }}
      >
        <Button
          aria-label={t('searchRows')}
          className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={isReading}
          size="icon"
          type="submit"
          variant="ghost"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
        <Input
          aria-label={t('searchRows')}
          className="h-9 w-40 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          maxLength={200}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={t('searchRows')}
          value={typed}
        />
        {search !== '' && (
          <Button
            aria-label={t('searchClear')}
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setTyped('');
              searchFor('');
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        )}
      </form>
    </search>
  );
};
