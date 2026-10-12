import { canManageWorkspace, USER_ROLE_VALUES } from '@neuma/shared';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SettingsNavItem } from '../types/settings.types';

export const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  { href: ROUTES.PORTAL_SETTINGS_TOKENS, labelKey: 'tokens' },
  {
    href: ROUTES.PORTAL_SETTINGS_WORKSPACE_TOKENS,
    labelKey: 'workspaceTokens',
    roles: USER_ROLE_VALUES.filter(canManageWorkspace),
  },
];
