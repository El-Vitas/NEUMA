import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import { filterNavItemsByRole, filterNavSectionsByRole } from '@/modules/portal/lib/portal.nav.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

describe('filterNavSectionsByRole', () => {
  it('includes the users item for admins', () => {
    const items = filterNavSectionsByRole(USER_ROLE.ADMIN).flatMap((section) => section.items);
    expect(items.some((item) => item.href === ROUTES.PORTAL_USERS)).toBe(true);
  });

  it('hides the users item for non-admins', () => {
    const items = filterNavSectionsByRole(USER_ROLE.CLIENT).flatMap((section) => section.items);
    expect(items.some((item) => item.href === ROUTES.PORTAL_USERS)).toBe(false);
  });
});

describe('filterNavItemsByRole', () => {
  it('keeps unrestricted items for every role', () => {
    const items = filterNavItemsByRole(USER_ROLE.WORKER);
    expect(items.some((item) => item.href === ROUTES.PORTAL_ACCOUNT)).toBe(true);
  });
});
