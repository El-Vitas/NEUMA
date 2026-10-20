import { describe, expect, test } from 'bun:test';
import {
  buildEditedRangeFilter,
  buildSearchSpaceVisibilityFilter,
  buildVerifiedOnlyFilter,
} from '@/modules/search/utils/search.filter.utils';
import { asText } from '@/modules/search/utils/search.sql.utils';
import { createSqlTagForTests, renderSqlFragment } from '../../../helpers/sql.fragment.helper';

const sql = createSqlTagForTests();

const renderEditedRange = (range: Parameters<typeof buildEditedRangeFilter>[1]): string =>
  renderSqlFragment(buildEditedRangeFilter(sql, range, asText(sql`"block"."editedAt"`)).buildAst());

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

  test('filters on the column it is given', () => {
    expect(renderEditedRange('TODAY')).toContain('"block"."editedAt" >=');
  });
});

describe('buildVerifiedOnlyFilter', () => {
  test('requires a verification stamp on the page', () => {
    expect(renderVerifiedOnly()).toContain('"page"."verifiedAt" IS NOT NULL');
  });

  test('accepts a page with no expiration at all', () => {
    expect(renderVerifiedOnly()).toContain('"page"."verificationExpiresAt" IS NULL');
  });

  test('compares an existing expiration against the current moment, not a stored flag', () => {
    expect(renderVerifiedOnly()).toContain('"page"."verificationExpiresAt" > now()');
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
