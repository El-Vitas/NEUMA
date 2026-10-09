import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import { isSettingsNavItemActive, listSettingsNavItems } from '@/modules/settings/lib/settings.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

describe('listSettingsNavItems', () => {
  it('shows everyone their own tokens', () => {
    expect(listSettingsNavItems(USER_ROLE.WORKER).map((item) => item.href)).toEqual([ROUTES.PORTAL_SETTINGS_TOKENS]);
  });

  it('adds the workspace tokens only for an administrator', () => {
    expect(listSettingsNavItems(USER_ROLE.ADMIN).map((item) => item.href)).toEqual([
      ROUTES.PORTAL_SETTINGS_TOKENS,
      ROUTES.PORTAL_SETTINGS_WORKSPACE_TOKENS,
    ]);
  });
});

describe('isSettingsNavItemActive', () => {
  // The pathname has no locale prefix, as the portal navigation provides it.
  it('marks the section of the page being looked at, including the pages inside it', () => {
    expect(isSettingsNavItemActive('/settings/tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(true);
    expect(isSettingsNavItemActive('/settings/tokens/new', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(true);
  });

  it('does not mark a section whose name only starts the same, nor one that only holds it further down', () => {
    expect(isSettingsNavItemActive('/settings/workspace-tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(false);
    expect(isSettingsNavItemActive('/settings/tokens-old', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(false);
    expect(isSettingsNavItemActive('/spaces/a/settings/tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(false);
  });
});
