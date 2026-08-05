'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  SEARCH_FILTER_ALL_VALUE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_SOURCE_TYPES,
} from '@/shared/constants/search.constants';
import { buildSearchPageUrl } from '@/shared/lib/search.lib';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';
import type { SearchQuery } from '@/shared/types/search.types';

interface IProps {
  readonly initialValues: SearchQuery;
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

export const SearchForm = ({ initialValues, spaces }: IProps) => {
  const t = useTranslations('portal.search');
  const router = useRouter();
  const [query, setQuery] = useState(initialValues.query);
  const [contentType] = useState(initialValues.contentType);
  const [sourceType, setSourceType] = useState<string>(initialValues.sourceType ?? SEARCH_FILTER_ALL_VALUE);
  const [spaceId, setSpaceId] = useState<string>(initialValues.spaceId ?? SEARCH_FILTER_ALL_VALUE);
  const [tags, setTags] = useState(() => initialValues.tags?.join(',') ?? '');

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = searchQuerySchema.parse({
      query,
      contentType,
      sourceType: sourceType === SEARCH_FILTER_ALL_VALUE ? undefined : sourceType,
      spaceId: spaceId === SEARCH_FILTER_ALL_VALUE ? undefined : spaceId,
      tags,
    });
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
              className="min-h-11 pl-9 text-base"
              id="search-query"
              maxLength={SEARCH_MAX_QUERY_LENGTH}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('queryPlaceholder')}
              type="search"
              value={query}
            />
          </div>
        </div>
        <Button className="min-h-11 w-full sm:w-auto" type="submit" variant="outline">
          {t('submit')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search-space">{t('spaceFilter')}</Label>
          <Select onValueChange={setSpaceId} value={spaceId}>
            <SelectTrigger aria-label={t('spaceFilter')} className="min-h-11 w-full" id="search-space">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEARCH_FILTER_ALL_VALUE}>{t('allSpaces')}</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-content-type">{t('contentTypeFilter')}</Label>
          <Select onValueChange={setSourceType} value={sourceType}>
            <SelectTrigger aria-label={t('contentTypeFilter')} className="min-h-11 w-full" id="search-content-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEARCH_FILTER_ALL_VALUE}>{t('allContentTypes')}</SelectItem>
              {SEARCH_SOURCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`sourceTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
