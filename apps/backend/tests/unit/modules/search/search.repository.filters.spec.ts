import { describe, expect, test } from 'bun:test';
import { buildEditedRangeFilter } from '@/modules/search/infrastructure/persistence/search.repository';

describe('buildEditedRangeFilter', () => {
  test('bounds today to the start of the calendar day', () => {
    expect(buildEditedRangeFilter('TODAY').sql).toContain("date_trunc('day', now())");
  });

  test('bounds the last seven days to a rolling window', () => {
    expect(buildEditedRangeFilter('LAST_SEVEN_DAYS').sql).toContain("now() - interval '7 days'");
  });

  test('bounds the last month to a rolling window', () => {
    expect(buildEditedRangeFilter('LAST_MONTH').sql).toContain("now() - interval '30 days'");
  });

  test('bounds this year to the start of the calendar year', () => {
    expect(buildEditedRangeFilter('THIS_YEAR').sql).toContain("date_trunc('year', now())");
  });

  test('always filters on the document last-updated column', () => {
    expect(buildEditedRangeFilter('TODAY').sql).toContain('"searchDocument"."updatedAt" >=');
  });
});
