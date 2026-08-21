'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  SEARCH_FILTER_ALL_VALUE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_SOURCE_TYPES,
} from '@/shared/constants/search.constants';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';
import type { SearchQuery } from '@/shared/types/search.types';
import {
  SEARCH_EDITED_RANGE_LABEL_KEYS,
  SEARCH_EDITED_RANGE_VALUES,
  SEARCH_MAX_AUTHOR_QUERY_LENGTH,
} from '../constants/search.filters.constants';
import { buildFilteredSearchPageUrl } from '../lib/search.filters.lib';
import { searchExtraFiltersSchema } from '../schemas/search.filters.schemas';
import type { SearchExtraFilters } from '../types/search.types';
import { SearchFilterChips } from './search.filters.chips';

interface IProps {
  readonly initialFilters: SearchExtraFilters;
  readonly initialValues: SearchQuery;
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

export const SearchForm = ({ initialFilters, initialValues, spaces }: IProps) => {
  const t = useTranslations('portal.search');
  const filtersT = useTranslations('pages.searchFilters');
  const router = useRouter();
  const [query, setQuery] = useState(initialValues.query);
  const [contentType] = useState(initialValues.contentType);
  const [sourceType, setSourceType] = useState<string>(initialValues.sourceType ?? SEARCH_FILTER_ALL_VALUE);
  const [spaceId, setSpaceId] = useState<string>(initialValues.spaceId ?? SEARCH_FILTER_ALL_VALUE);
  const [tags, setTags] = useState(() => initialValues.tags?.join(',') ?? '');
  const [authorQuery, setAuthorQuery] = useState(initialFilters.authorQuery ?? '');
  const [editedRange, setEditedRange] = useState<string>(initialFilters.editedRange ?? SEARCH_FILTER_ALL_VALUE);
  const [verifiedOnly, setVerifiedOnly] = useState(initialFilters.verifiedOnly ?? false);

  const submitSearch = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = searchQuerySchema.parse({
      query,
      contentType,
      sourceType: sourceType === SEARCH_FILTER_ALL_VALUE ? undefined : sourceType,
      spaceId: spaceId === SEARCH_FILTER_ALL_VALUE ? undefined : spaceId,
      tags,
    });
    const parsedFilters = searchExtraFiltersSchema.parse({
      authorQuery,
      editedRange: editedRange === SEARCH_FILTER_ALL_VALUE ? undefined : editedRange,
      verifiedOnly: verifiedOnly ? 'true' : undefined,
    });
    router.push(buildFilteredSearchPageUrl(parsed, parsedFilters));
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
      <div className="space-y-3">
        <h2 className="font-medium text-foreground text-sm">{filtersT('title')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="search-space">{filtersT('spaceLabel')}</Label>
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
          <div className="space-y-2">
            <Label htmlFor="search-author">{filtersT('authorLabel')}</Label>
            <Input
              className="min-h-11 text-base"
              id="search-author"
              maxLength={SEARCH_MAX_AUTHOR_QUERY_LENGTH}
              onChange={(event) => setAuthorQuery(event.target.value)}
              placeholder={filtersT('authorPlaceholder')}
              value={authorQuery}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-edited">{filtersT('editedLabel')}</Label>
            <Select onValueChange={setEditedRange} value={editedRange}>
              <SelectTrigger aria-label={filtersT('editedPlaceholder')} className="min-h-11 w-full" id="search-edited">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEARCH_FILTER_ALL_VALUE}>{filtersT('dateOptions.anyDate')}</SelectItem>
                {SEARCH_EDITED_RANGE_VALUES.map((range) => (
                  <SelectItem key={range} value={range}>
                    {filtersT(`dateOptions.${SEARCH_EDITED_RANGE_LABEL_KEYS[range]}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-2.5">
            <Checkbox
              checked={verifiedOnly}
              id="search-verified-only"
              onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
            />
            <Label className="font-normal" htmlFor="search-verified-only">
              {filtersT('verifiedOnlyLabel')}
            </Label>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{t('filterHint')}</p>
        <SearchFilterChips filters={initialFilters} params={initialValues} spaces={spaces} />
      </div>
    </form>
  );
};
