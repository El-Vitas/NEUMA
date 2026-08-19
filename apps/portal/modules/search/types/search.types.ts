import type { z } from 'zod';
import type { SearchQuery } from '@/shared/types/search.types';
import type { SEARCH_EDITED_RANGE_VALUES } from '../constants/search.filters.constants';
import type { searchExtraFiltersSchema } from '../schemas/search.filters.schemas';

export type SearchEditedRange = (typeof SEARCH_EDITED_RANGE_VALUES)[number];

export type SearchExtraFilters = z.infer<typeof searchExtraFiltersSchema>;

export type RemovableSearchFilterKey = 'authorQuery' | 'editedRange' | 'spaceId' | 'sourceType' | 'tags';

export interface ActiveSearchFilterChip {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly removeHref: string;
}

export interface SearchFilterCategoryLabels {
  readonly author: string;
  readonly editedRange: string;
  readonly sourceType: string;
  readonly space: string;
  readonly tags: string;
}

export interface SearchFilterChipContext {
  readonly categoryLabels: SearchFilterCategoryLabels;
  readonly editedRangeValueLabel: string;
  readonly filters: SearchExtraFilters;
  readonly params: SearchQuery;
  readonly sourceTypeValueLabel: string;
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

export interface SearchInstantPageCandidate {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export type SearchResultSpaceDisplay =
  | { readonly kind: 'known'; readonly spaceName: string }
  | { readonly kind: 'unknown' };

export type SearchResultParentDisplay =
  | { readonly kind: 'atSpaceRoot' }
  | { readonly kind: 'underParentPage'; readonly parentPageTitle: string }
  | { readonly kind: 'unknown' };
