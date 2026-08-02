import type { UserRole } from '@company-brain/shared';
import type { LucideIcon } from 'lucide-react';

export interface PortalNavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly roles?: readonly UserRole[];
}

export interface PortalNavSection {
  readonly label: string;
  readonly items: readonly PortalNavItem[];
}
