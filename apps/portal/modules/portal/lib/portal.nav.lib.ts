import type { UserRole } from '@neuma/shared';
import { DASHBOARD_NAV_SECTIONS } from '../constants/portal.nav.constants';
import type { PortalNavItem, PortalNavSection } from '../types/portal.types';

const isNavItemVisibleForRole = (item: PortalNavItem, role: UserRole): boolean =>
  item.roles === undefined || item.roles.includes(role);

export const filterNavSectionsByRole = (role: UserRole): readonly PortalNavSection[] =>
  DASHBOARD_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isNavItemVisibleForRole(item, role)),
  })).filter((section) => section.items.length > 0);

export const filterNavItemsByRole = (role: UserRole): readonly PortalNavItem[] =>
  filterNavSectionsByRole(role).flatMap((section) => section.items);
