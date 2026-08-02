import type { UserRole } from '@company-brain/shared';
import type { LucideIcon } from 'lucide-react';

export interface PortalNavItem {
  readonly href: string;
  readonly labelKey: string;
  readonly icon: LucideIcon;
  readonly roles?: readonly UserRole[];
}

export interface PortalNavSection {
  readonly labelKey: string;
  readonly items: readonly PortalNavItem[];
}
