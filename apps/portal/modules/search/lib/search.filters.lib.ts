import { appendSearchExtraParams, buildSearchPageUrl } from '@/shared/lib/search.lib';
import type { SearchQuery } from '@/shared/types/search.types';
import type {
  ActiveSearchFilterChip,
  RemovableSearchFilterKey,
  SearchExtraFilters,
  SearchFilterChipContext,
} from '../types/search.types';

export const toSearchExtraFilterParams = (filters: SearchExtraFilters): Readonly<Record<string, string>> => {
  const params: Record<string, string> = {};
  if (filters.authorQuery !== undefined) params.authorQuery = filters.authorQuery;
  if (filters.editedRange !== undefined) params.editedRange = filters.editedRange;
  if (filters.verifiedOnly === true) params.verifiedOnly = 'true';
  return params;
};

export const buildFilteredSearchPageUrl = (params: SearchQuery, filters: SearchExtraFilters): string =>
  appendSearchExtraParams(buildSearchPageUrl(params), toSearchExtraFilterParams(filters));

const withoutBaseFilter = (params: SearchQuery, key: RemovableSearchFilterKey): SearchQuery => {
  switch (key) {
    case 'spaceId':
      return { ...params, spaceId: undefined };
    case 'sourceType':
      return { ...params, sourceType: undefined };
    default:
      return params;
  }
};

const withoutExtraFilter = (filters: SearchExtraFilters, key: RemovableSearchFilterKey): SearchExtraFilters => {
  switch (key) {
    case 'authorQuery':
      return { ...filters, authorQuery: undefined };
    case 'editedRange':
      return { ...filters, editedRange: undefined };
    case 'verifiedOnly':
      return { ...filters, verifiedOnly: undefined };
    default:
      return filters;
  }
};

export const buildSearchPageUrlWithoutFilter = (
  params: SearchQuery,
  filters: SearchExtraFilters,
  key: RemovableSearchFilterKey,
): string => buildFilteredSearchPageUrl(withoutBaseFilter(params, key), withoutExtraFilter(filters, key));

export const buildClearAllFiltersUrl = (params: SearchQuery): string =>
  buildSearchPageUrl({ limit: params.limit, query: params.query });

export const hasAnyActiveFilter = (params: SearchQuery, filters: SearchExtraFilters): boolean =>
  params.spaceId !== undefined ||
  params.sourceType !== undefined ||
  filters.authorQuery !== undefined ||
  filters.editedRange !== undefined ||
  filters.verifiedOnly !== undefined;

const buildSpaceChip = (context: SearchFilterChipContext): ActiveSearchFilterChip | null => {
  const { categoryLabels, filters, params, spaces } = context;
  if (params.spaceId === undefined) return null;
  const spaceName = spaces.find((space) => space.id === params.spaceId)?.name ?? params.spaceId;
  return {
    id: 'spaceId',
    label: `${categoryLabels.space}: ${spaceName}`,
    name: categoryLabels.space,
    removeHref: buildSearchPageUrlWithoutFilter(params, filters, 'spaceId'),
  };
};

const buildSourceTypeChip = (context: SearchFilterChipContext): ActiveSearchFilterChip | null => {
  const { categoryLabels, filters, params, sourceTypeValueLabel } = context;
  if (params.sourceType === undefined) return null;
  return {
    id: 'sourceType',
    label: `${categoryLabels.sourceType}: ${sourceTypeValueLabel}`,
    name: categoryLabels.sourceType,
    removeHref: buildSearchPageUrlWithoutFilter(params, filters, 'sourceType'),
  };
};

const buildAuthorChip = (context: SearchFilterChipContext): ActiveSearchFilterChip | null => {
  const { categoryLabels, filters, params } = context;
  if (filters.authorQuery === undefined) return null;
  return {
    id: 'authorQuery',
    label: `${categoryLabels.author}: ${filters.authorQuery}`,
    name: categoryLabels.author,
    removeHref: buildSearchPageUrlWithoutFilter(params, filters, 'authorQuery'),
  };
};

const buildEditedRangeChip = (context: SearchFilterChipContext): ActiveSearchFilterChip | null => {
  const { categoryLabels, editedRangeValueLabel, filters, params } = context;
  if (filters.editedRange === undefined) return null;
  return {
    id: 'editedRange',
    label: `${categoryLabels.editedRange}: ${editedRangeValueLabel}`,
    name: categoryLabels.editedRange,
    removeHref: buildSearchPageUrlWithoutFilter(params, filters, 'editedRange'),
  };
};

const buildVerifiedOnlyChip = (context: SearchFilterChipContext): ActiveSearchFilterChip | null => {
  const { categoryLabels, filters, params } = context;
  if (filters.verifiedOnly !== true) return null;
  return {
    id: 'verifiedOnly',
    label: categoryLabels.verifiedOnly,
    name: categoryLabels.verifiedOnly,
    removeHref: buildSearchPageUrlWithoutFilter(params, filters, 'verifiedOnly'),
  };
};

export const buildActiveSearchFilterChips = (context: SearchFilterChipContext): readonly ActiveSearchFilterChip[] => {
  const candidates = [
    buildSpaceChip(context),
    buildSourceTypeChip(context),
    buildAuthorChip(context),
    buildEditedRangeChip(context),
    buildVerifiedOnlyChip(context),
  ];
  return candidates.filter((chip): chip is ActiveSearchFilterChip => chip !== null);
};
