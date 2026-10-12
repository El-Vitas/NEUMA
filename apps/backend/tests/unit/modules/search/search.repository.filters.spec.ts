import { describe, expect, test } from 'bun:test';
import {
  buildEditedRangeFilter,
  buildSearchSpaceVisibilityFilter,
  buildVerifiedOnlyFilter,
} from '@/modules/search/infrastructure/persistence/search.repository';
import { createSqlTagForTests, renderSqlFragment } from '../../../helpers/sql.fragment.helper';

const sql = createSqlTagForTests();

const renderEditedRange = (range: Parameters<typeof buildEditedRangeFilter>[1]): string =>
  renderSqlFragment(buildEditedRangeFilter(sql, range).buildAst());

const renderVerifiedOnly = (): string => renderSqlFragment(buildVerifiedOnlyFilter(sql).buildAst());

const renderVisibility = (role: Parameters<typeof buildSearchSpaceVisibilityFilter>[2]): string =>
  renderSqlFragment(buildSearchSpaceVisibilityFilter(sql, 'user-a', role).buildAst());

describe('buildEditedRangeFilter', () => {
  test('bounds today to the start of the calendar day', () => {
    expect(renderEditedRange('TODAY')).toContain("date_trunc('day', now())");
  });

  test('bounds the last seven days to a rolling window', () => {
    expect(renderEditedRange('LAST_SEVEN_DAYS')).toContain("now() - interval '7 days'");
  });

  test('bounds the last month to a rolling window', () => {
    expect(renderEditedRange('LAST_MONTH')).toContain("now() - interval '30 days'");
  });

  test('bounds this year to the start of the calendar year', () => {
    expect(renderEditedRange('THIS_YEAR')).toContain("date_trunc('year', now())");
  });

  test('always filters on the document last-updated column', () => {
    expect(renderEditedRange('TODAY')).toContain('"searchDocument"."updatedAt" >=');
  });
});

describe('buildVerifiedOnlyFilter', () => {
  test('requires a verification stamp to be present', () => {
    expect(renderVerifiedOnly()).toContain('"searchDocument"."properties"->>\'verifiedAt\' IS NOT NULL');
  });

  test('accepts a page with no expiration at all', () => {
    expect(renderVerifiedOnly()).toContain('"searchDocument"."properties"->>\'verificationExpiresAt\' IS NULL');
  });

  test('compares an existing expiration against the current moment, not a stored flag', () => {
    expect(renderVerifiedOnly()).toContain(
      '("searchDocument"."properties"->>\'verificationExpiresAt\')::timestamptz > now()',
    );
  });
});

describe('buildSearchSpaceVisibilityFilter', () => {
  test('never lets a reader see a space merely because of who they are', () => {
    for (const role of ['ADMIN', 'WORKER', 'CLIENT'] as const) {
      // A bare `true` among the alternatives swallows the others: the guard collapses and every space becomes visible.
      expect(renderVisibility(role)).not.toMatch(/OR\s+true/i);
    }
  });

  test('weighs each visibility against its own rule, admin included', () => {
    const rendered = renderVisibility('ADMIN');

    expect(rendered).toContain('PRIVATE');
    expect(rendered).toContain('RESTRICTED');
    expect(rendered).toContain('PUBLIC_INTERNAL');
  });
});
