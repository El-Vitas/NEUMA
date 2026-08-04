'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SEARCH_SOURCE_TYPES } from '../constants/search.constants';
import { buildSearchPageUrl } from '../lib/search.lib';
import { searchQuerySchema } from '../schemas/search.schemas';
import type { SearchQuery } from '../types/search.types';

interface IProps {
  readonly initialValues: SearchQuery;
}

export const SearchForm = ({ initialValues }: IProps) => {
  const t = useTranslations('portal.search');
  const router = useRouter();
  const [query, setQuery] = useState(initialValues.query);
  const [contentType, setContentType] = useState(initialValues.contentType ?? '');
  const [sourceType, setSourceType] = useState(initialValues.sourceType ?? '');
  const [spaceId, setSpaceId] = useState(initialValues.spaceId ?? '');
  const [tags, setTags] = useState(() => initialValues.tags?.join(',') ?? '');

  const submitSearch = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = searchQuerySchema.parse({ query, contentType, sourceType, spaceId, tags });
    router.push(buildSearchPageUrl(parsed));
  };

  return (
    <form aria-label={t('formLabel')} className="space-y-4" onSubmit={submitSearch}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="search-query">{t('queryLabel')}</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t('queryLabel')}
              className="min-h-11 pl-9 text-base"
              id="search-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('queryPlaceholder')}
              type="search"
              value={query}
            />
          </div>
        </div>
        <Button className="min-h-11 w-full sm:w-auto" type="submit">
          {t('submit')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search-space">{t('spaceLabel')}</Label>
          <Input
            className="min-h-11 text-base"
            id="search-space"
            onChange={(event) => setSpaceId(event.target.value)}
            placeholder={t('spacePlaceholder')}
            value={spaceId}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-content-type">{t('contentTypeLabel')}</Label>
          <Input
            className="min-h-11 text-base"
            id="search-content-type"
            onChange={(event) => setContentType(event.target.value)}
            placeholder={t('contentTypePlaceholder')}
            value={contentType}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-source-type">{t('sourceTypeLabel')}</Label>
          <select
            aria-label={t('sourceTypeLabel')}
            className="h-11 w-full rounded-none border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="search-source-type"
            onChange={(event) => setSourceType(event.target.value)}
            value={sourceType}
          >
            <option value="">{t('allSources')}</option>
            {SEARCH_SOURCE_TYPES.map((sourceType) => (
              <option key={sourceType} value={sourceType}>
                {t(`sourceTypes.${sourceType}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-tags">{t('tagsLabel')}</Label>
          <Input
            className="min-h-11 text-base"
            id="search-tags"
            onChange={(event) => setTags(event.target.value)}
            placeholder={t('tagsPlaceholder')}
            value={tags}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{t('filterHint')}</p>
    </form>
  );
};
