import type { PageIcon, PageLifecycle, UserRole } from '@company-brain/shared';
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

/**
 * What kind of place a space is, from the standpoint of whoever is looking at
 * the tree: everyone's, a private corner of their own, or somebody else's
 * corner they were let into.
 */
export type PortalSpaceKind = 'own' | 'private' | 'shared';

export interface PortalLayoutSpace {
  readonly icon: null | PageIcon;
  readonly id: string;
  readonly kind: PortalSpaceKind;
  readonly name: string;
  readonly pages: readonly PortalSidebarPage[];
}

export interface PortalSidebarPage {
  readonly icon: null | PageIcon;
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
