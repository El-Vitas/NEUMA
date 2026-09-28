import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import { isSettingsNavItemActive, listSettingsNavItems } from '@/modules/settings/lib/settings.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

describe('listSettingsNavItems', () => {
  it('shows everyone their own tokens', () => {
    expect(listSettingsNavItems(USER_ROLE.WORKER).map((item) => item.href)).toEqual([ROUTES.PORTAL_SETTINGS_TOKENS]);
  });

  /** Ver y revocar los tokens de todo el espacio de trabajo es de quien administra. */
  it('adds the workspace tokens only for an administrator', () => {
    expect(listSettingsNavItems(USER_ROLE.ADMIN).map((item) => item.href)).toEqual([
      ROUTES.PORTAL_SETTINGS_TOKENS,
      ROUTES.PORTAL_SETTINGS_WORKSPACE_TOKENS,
    ]);
  });
});

describe('isSettingsNavItemActive', () => {
  it('marks the section of the page being looked at, including the pages inside it', () => {
    expect(isSettingsNavItemActive('/es/settings/tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(true);
    expect(isSettingsNavItemActive('/es/settings/tokens/new', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(true);
    expect(isSettingsNavItemActive('/settings/tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(true);
  });

  /** «tokens» es el comienzo de «tokens-…»: una sección no se enciende por compartir el principio del nombre. */
  it('does not mark a section whose name only starts the same', () => {
    expect(isSettingsNavItemActive('/es/settings/workspace-tokens', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(false);
    expect(isSettingsNavItemActive('/es/settings/tokens-old', ROUTES.PORTAL_SETTINGS_TOKENS)).toBe(false);
  });
});
