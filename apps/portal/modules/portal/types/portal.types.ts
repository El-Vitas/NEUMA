import type { PageLifecycle, UserRole } from '@company-brain/shared';
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

export interface PortalLayoutSpace {
  readonly id: string;
  readonly name: string;
  readonly pages: readonly PortalSidebarPage[];
}

export interface PortalSidebarPage {
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: null | string;
  readonly title: string;
}

export interface PortalSidebarPageTreeItem {
  readonly children: readonly PortalSidebarPageTreeItem[];
  readonly page: PortalSidebarPage;
}

export interface PortalLayoutUser {
  readonly email: string;
  readonly name: string;
}
