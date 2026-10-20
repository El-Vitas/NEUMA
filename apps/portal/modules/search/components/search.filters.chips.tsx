import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { SearchQuery } from '@/shared/types/search.types';
import { SEARCH_EDITED_RANGE_LABEL_KEYS } from '../constants/search.filters.constants';
import { buildActiveSearchFilterChips, buildClearAllFiltersUrl, hasAnyActiveFilter } from '../lib/search.filters.lib';
import type { SearchExtraFilters } from '../types/search.types';

interface IProps {
  readonly filters: SearchExtraFilters;
  readonly params: SearchQuery;
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

export const SearchFilterChips = ({ filters, params, spaces }: IProps) => {
  const filtersT = useTranslations('pages.searchFilters');
  const searchT = useTranslations('portal.search');

  if (!hasAnyActiveFilter(params, filters)) return null;

  const chips = buildActiveSearchFilterChips({
    categoryLabels: {
      author: filtersT('authorLabel'),
      editedRange: filtersT('editedLabel'),
      sourceType: searchT('contentTypeFilter'),
      space: filtersT('spaceLabel'),
      verifiedOnly: filtersT('verifiedOnlyLabel'),
    },
    editedRangeValueLabel:
      filters.editedRange === undefined
        ? ''
        : filtersT(`dateOptions.${SEARCH_EDITED_RANGE_LABEL_KEYS[filters.editedRange]}`),
    filters,
    params,
    sourceTypeValueLabel: params.sourceType === undefined ? '' : searchT(`sourceTypes.${params.sourceType}`),
    spaces,
  });

  return (
    <fieldset aria-label={filtersT('title')} className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
      {chips.map((chip) => (
        <Link
          aria-label={filtersT('removeFilter', { name: chip.name })}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm hover:bg-muted ${FOCUS_RING_CLASS}`}
          href={chip.removeHref}
          key={chip.id}
        >
          <span>{chip.label}</span>
          <X aria-hidden="true" className="size-3.5" />
        </Link>
      ))}
      <Link
        className={`inline-flex min-h-11 items-center px-3 text-muted-foreground text-sm underline-offset-4 hover:underline ${FOCUS_RING_CLASS}`}
        href={buildClearAllFiltersUrl(params)}
      >
        {filtersT('clearAll')}
      </Link>
    </fieldset>
  );
};
