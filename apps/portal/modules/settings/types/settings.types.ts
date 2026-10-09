import type { UserRole } from '@neuma/shared';

/** Without `roles`, every role sees the item. */
export interface SettingsNavItem {
  readonly href: string;
  readonly labelKey: string;
  readonly roles?: readonly UserRole[];
}
