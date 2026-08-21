import { describe, expect, test } from 'bun:test';
import {
  buildEditedRangeFilter,
  buildSearchSpaceVisibilityFilter,
  buildVerifiedOnlyFilter,
} from '@/modules/search/infrastructure/persistence/search.repository';

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

describe('buildVerifiedOnlyFilter', () => {
  test('requires a verification stamp to be present', () => {
    expect(buildVerifiedOnlyFilter().sql).toContain('"searchDocument"."properties"->>\'verifiedAt\' IS NOT NULL');
  });

  test('accepts a page with no expiration at all', () => {
    expect(buildVerifiedOnlyFilter().sql).toContain(
      '"searchDocument"."properties"->>\'verificationExpiresAt\' IS NULL',
    );
  });

  test('compares an existing expiration against the current moment, not a stored flag', () => {
    expect(buildVerifiedOnlyFilter().sql).toContain(
      '("searchDocument"."properties"->>\'verificationExpiresAt\')::timestamptz > now()',
    );
  });
});

describe('buildSearchSpaceVisibilityFilter', () => {
  const readSql = (sql: { strings: readonly string[]; values: readonly unknown[] }): string =>
    sql.strings.reduce((joined, part, at) => `${joined}${at === 0 ? '' : String(sql.values[at - 1])}${part}`, '');

  test('never lets a reader see a space merely because of who they are', () => {
    for (const role of ['ADMIN', 'WORKER', 'CLIENT'] as const) {
      const sql = readSql(buildSearchSpaceVisibilityFilter('user-a', role));

      /**
       * A bare `true` among the alternatives swallows every other one: the
       * whole guard collapses and the reader sees every space there is.
       */
      expect(sql).not.toMatch(/OR\s+true/i);
    }
  });

  test('weighs each visibility against its own rule, admin included', () => {
    const sql = readSql(buildSearchSpaceVisibilityFilter('user-a', 'ADMIN'));

    expect(sql).toContain('PRIVATE');
    expect(sql).toContain('RESTRICTED');
    expect(sql).toContain('PUBLIC_INTERNAL');
  });
});
