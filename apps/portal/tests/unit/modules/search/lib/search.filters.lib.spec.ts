import { describe, expect, it } from 'bun:test';
import {
  buildActiveSearchFilterChips,
  buildClearAllFiltersUrl,
  buildFilteredSearchPageUrl,
  buildSearchPageUrlWithoutFilter,
  buildSearchPageUrlWithoutTag,
  hasAnyActiveFilter,
  toSearchExtraFilterParams,
} from '@/modules/search/lib/search.filters.lib';
import type { SearchExtraFilters, SearchFilterCategoryLabels } from '@/modules/search/types/search.types';
import type { SearchQuery } from '@/shared/types/search.types';

const baseParams: SearchQuery = { limit: 20, query: 'roadmap' };
const categoryLabels: SearchFilterCategoryLabels = {
  author: 'Author',
  editedRange: 'Edited date',
  sourceType: 'Content type',
  space: 'Space',
  tags: 'Tags',
};

describe('buildFilteredSearchPageUrl', () => {
  it('leaves the base URL untouched when no extra filters are set', () => {
    expect(buildFilteredSearchPageUrl(baseParams, {})).toBe('/search?query=roadmap');
  });

  it('appends the author query and edited range', () => {
    expect(buildFilteredSearchPageUrl(baseParams, { authorQuery: 'Ada', editedRange: 'LAST_SEVEN_DAYS' })).toBe(
      '/search?query=roadmap&authorQuery=Ada&editedRange=LAST_SEVEN_DAYS',
    );
  });
});

describe('toSearchExtraFilterParams', () => {
  it('returns an empty record when nothing is set', () => {
    expect(toSearchExtraFilterParams({})).toEqual({});
  });

  it('turns the applied filters into a plain params record', () => {
    expect(toSearchExtraFilterParams({ authorQuery: 'Ada', editedRange: 'LAST_SEVEN_DAYS' })).toEqual({
      authorQuery: 'Ada',
      editedRange: 'LAST_SEVEN_DAYS',
    });
  });
});

describe('buildSearchPageUrlWithoutFilter', () => {
  it('drops only the requested base filter', () => {
    const params: SearchQuery = { ...baseParams, spaceId: 'space-1', sourceType: 'PAGE' };
    expect(buildSearchPageUrlWithoutFilter(params, {}, 'spaceId')).toBe('/search?query=roadmap&sourceType=PAGE');
  });

  it('drops only the requested extra filter', () => {
    const filters: SearchExtraFilters = { authorQuery: 'Ada', editedRange: 'THIS_YEAR' };
    expect(buildSearchPageUrlWithoutFilter(baseParams, filters, 'authorQuery')).toBe(
      '/search?query=roadmap&editedRange=THIS_YEAR',
    );
  });
});

describe('buildSearchPageUrlWithoutTag', () => {
  it('drops a single tag while keeping the others', () => {
    const params: SearchQuery = { ...baseParams, tags: ['alpha', 'beta'] };
    expect(buildSearchPageUrlWithoutTag(params, {}, 'alpha')).toBe('/search?query=roadmap&tags=beta');
  });

  it('drops the tags filter entirely once the last tag is removed', () => {
    const params: SearchQuery = { ...baseParams, tags: ['alpha'] };
    expect(buildSearchPageUrlWithoutTag(params, {}, 'alpha')).toBe('/search?query=roadmap');
  });
});

describe('buildClearAllFiltersUrl', () => {
  it('keeps the query text but drops every filter', () => {
    const params: SearchQuery = {
      ...baseParams,
      contentType: 'guide',
      spaceId: 'space-1',
      sourceType: 'PAGE',
      tags: ['alpha'],
    };
    expect(buildClearAllFiltersUrl(params)).toBe('/search?query=roadmap');
  });
});

describe('hasAnyActiveFilter', () => {
  it('is false when nothing is filtered', () => {
    expect(hasAnyActiveFilter(baseParams, {})).toBe(false);
  });

  it('is true when only an extra filter is set', () => {
    expect(hasAnyActiveFilter(baseParams, { authorQuery: 'Ada' })).toBe(true);
  });

  it('is true when only a base filter is set', () => {
    expect(hasAnyActiveFilter({ ...baseParams, spaceId: 'space-1' }, {})).toBe(true);
  });
});

describe('buildActiveSearchFilterChips', () => {
  it('builds one chip per applied filter, including one per tag', () => {
    const params: SearchQuery = { ...baseParams, spaceId: 'space-1', tags: ['alpha', 'beta'] };
    const filters: SearchExtraFilters = { authorQuery: 'Ada', editedRange: 'TODAY' };

    const chips = buildActiveSearchFilterChips({
      categoryLabels,
      editedRangeValueLabel: 'Today',
      filters,
      params,
      sourceTypeValueLabel: '',
      spaces: [{ id: 'space-1', name: 'Engineering' }],
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      'Space: Engineering',
      'Tags: alpha',
      'Tags: beta',
      'Author: Ada',
      'Edited date: Today',
    ]);
  });

  it('returns no chips when nothing is filtered', () => {
    expect(
      buildActiveSearchFilterChips({
        categoryLabels,
        editedRangeValueLabel: '',
        filters: {},
        params: baseParams,
        sourceTypeValueLabel: '',
        spaces: [],
      }),
    ).toEqual([]);
  });
});
