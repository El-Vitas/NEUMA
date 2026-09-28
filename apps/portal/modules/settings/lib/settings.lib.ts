import type { UserRole } from '@company-brain/shared';
import { SETTINGS_NAV_ITEMS } from '../constants/settings.constants';
import type { SettingsNavItem } from '../types/settings.types';

const isSettingsNavItemVisibleFor = (item: SettingsNavItem, role: UserRole): boolean =>
  item.roles === undefined || item.roles.includes(role);

export const listSettingsNavItems = (role: UserRole): readonly SettingsNavItem[] =>
  SETTINGS_NAV_ITEMS.filter((item) => isSettingsNavItemVisibleFor(item, role));

/**
 * Si la página que se mira está en esa sección: la sección misma o algo dentro
 * de ella, con o sin el idioma adelante. Compartir solo el principio del nombre
 * no cuenta.
 */
export const isSettingsNavItemActive = (pathname: string, href: string): boolean =>
  pathname.endsWith(href) || pathname.includes(`${href}/`);
