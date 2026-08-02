import { USER_ROLE } from '@company-brain/shared';
import { LayoutDashboard, UserCircle, Users } from 'lucide-react';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

import type { PortalNavSection } from '../types/portal.types';

export const DASHBOARD_NAV_SECTIONS: readonly PortalNavSection[] = [
  {
    label: 'General',
    items: [
      { href: ROUTES.PORTAL, label: 'Inicio', icon: LayoutDashboard },
      { href: ROUTES.PORTAL_USERS, label: 'Usuarios', icon: Users, roles: [USER_ROLE.ADMIN] },
      { href: ROUTES.PORTAL_ACCOUNT, label: 'Mi cuenta', icon: UserCircle },
    ],
  },
] as const;
