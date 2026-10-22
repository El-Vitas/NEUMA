import type { PageIcon, PageLifecycle, UserRole } from '@neuma/shared';
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

export type PortalSpaceKind = 'own' | 'private' | 'shared';

export interface PortalLayoutSpace {
  readonly icon: null | PageIcon;
  readonly id: string;
  readonly kind: PortalSpaceKind;
  readonly name: string;
}

export interface PortalSidebarPage {
  /** True when the page declares its own access instead of following its parent or the space. */
  readonly hasOwnPermissions?: boolean;
  /** The chevron shows without the children loaded; a collection never has any here (ADR 030). */
  readonly hasChildren?: boolean;
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
