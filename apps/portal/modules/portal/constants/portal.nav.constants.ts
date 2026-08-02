import { USER_ROLE } from '@company-brain/shared';
import { Database, LayoutDashboard, UserCircle, Users } from 'lucide-react';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

import type { PortalNavSection } from '../types/portal.types';

export const DASHBOARD_NAV_SECTIONS: readonly PortalNavSection[] = [
  {
    labelKey: 'general',
    items: [
      { href: ROUTES.PORTAL, labelKey: 'home', icon: LayoutDashboard },
      { href: ROUTES.PORTAL_DATABASES, labelKey: 'databases', icon: Database },
      { href: ROUTES.PORTAL_USERS, labelKey: 'users', icon: Users, roles: [USER_ROLE.ADMIN] },
      { href: ROUTES.PORTAL_ACCOUNT, labelKey: 'account', icon: UserCircle },
    ],
  },
] as const;
