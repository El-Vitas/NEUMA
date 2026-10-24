'use client';

import type { PageFilter } from '@neuma/shared';
import { ListFilter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { usePagesQuickFiltering } from '../hooks/use.pages.quick-filtering';
import type { PageSchema } from '../types/pages.schema.types';
import { PagesCollectionFilterEditor } from './pages.collection.filter-editor';

interface IProps {
  readonly activeViewName: string;
  readonly quickFilter: null | PageFilter;
  readonly schema: PageSchema;
  readonly search: string;
}

/** For whoever is looking: it narrows the view without changing it, so it is not saved and nobody else sees it. */
export const PagesCollectionQuickFilter = ({ activeViewName, quickFilter, schema, search }: IProps) => {
  const t = useTranslations('pages.collection');
  const filtering = usePagesQuickFiltering(activeViewName, quickFilter, search);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="min-h-11 rounded-md text-muted-foreground"
          data-testid="quick-filter"
          size="sm"
          type="button"
          variant="ghost"
        >
          <ListFilter aria-hidden="true" className="size-4" />
          {filtering.conditionCount === 0
            ? t('quickFilter')
            : t('quickFilterCount', { count: filtering.conditionCount })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(46rem,calc(100vw-2rem))]">
        <p className="mb-2 text-muted-foreground text-xs">{t('quickFilterHint')}</p>
        <PagesCollectionFilterEditor filtering={filtering} properties={schema.properties} />
      </PopoverContent>
    </Popover>
  );
};
