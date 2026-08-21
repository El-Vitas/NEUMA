import { describe, expect, it } from 'bun:test';
import { SEARCH_MAX_AUTHOR_QUERY_LENGTH } from '@/modules/search/constants/search.filters.constants';
import { searchExtraFiltersSchema } from '@/modules/search/schemas/search.filters.schemas';

describe('searchExtraFiltersSchema', () => {
  it('parses a known author query and edited range', () => {
    expect(searchExtraFiltersSchema.parse({ authorQuery: ' Ada ', editedRange: 'LAST_MONTH' })).toEqual({
      authorQuery: 'Ada',
      editedRange: 'LAST_MONTH',
    });
  });

  it('drops an empty author query', () => {
    expect(searchExtraFiltersSchema.parse({ authorQuery: '   ' })).toEqual({ authorQuery: undefined });
  });

  it('drops an edited range outside the known presets', () => {
    expect(searchExtraFiltersSchema.parse({ editedRange: 'yesterday' })).toEqual({ editedRange: undefined });
  });

  it('reads only the first value of a repeated search param', () => {
    expect(searchExtraFiltersSchema.parse({ authorQuery: ['Ada', 'Grace'] })).toEqual({ authorQuery: 'Ada' });
  });

  it('is empty when nothing is provided', () => {
    expect(searchExtraFiltersSchema.parse({})).toEqual({ authorQuery: undefined, editedRange: undefined });
  });

  it('truncates an author query longer than the address can reasonably carry, instead of crashing the screen', () => {
    const overlong = 'a'.repeat(SEARCH_MAX_AUTHOR_QUERY_LENGTH + 50);

    expect(() => searchExtraFiltersSchema.parse({ authorQuery: overlong })).not.toThrow();
    expect(searchExtraFiltersSchema.parse({ authorQuery: overlong }).authorQuery).toHaveLength(
      SEARCH_MAX_AUTHOR_QUERY_LENGTH,
    );
  });

  it('never throws for a hand-written or malformed URL, whatever filters it carries', () => {
    expect(() =>
      searchExtraFiltersSchema.parse({ authorQuery: ['Ada', 'Grace'], editedRange: 'not-a-real-range' }),
    ).not.toThrow();
  });

  it('reads an explicit verifiedOnly=true, and nothing else, as the filter being on', () => {
    expect(searchExtraFiltersSchema.parse({ verifiedOnly: 'true' }).verifiedOnly).toBe(true);
    expect(searchExtraFiltersSchema.parse({ verifiedOnly: 'false' }).verifiedOnly).toBeUndefined();
    expect(searchExtraFiltersSchema.parse({}).verifiedOnly).toBeUndefined();
  });
});
