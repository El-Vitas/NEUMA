import type { UserRole } from '@company-brain/shared';
import { SETTINGS_NAV_ITEMS } from '../constants/settings.constants';
import type { SettingsNavItem } from '../types/settings.types';

const isSettingsNavItemVisibleFor = (item: SettingsNavItem, role: UserRole): boolean =>
  item.roles === undefined || item.roles.includes(role);

export const listSettingsNavItems = (role: UserRole): readonly SettingsNavItem[] =>
  SETTINGS_NAV_ITEMS.filter((item) => isSettingsNavItemVisibleFor(item, role));

/** `pathname` has no locale prefix; matching on the `/` boundary avoids sibling sections sharing a name prefix. */
export const isSettingsNavItemActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
