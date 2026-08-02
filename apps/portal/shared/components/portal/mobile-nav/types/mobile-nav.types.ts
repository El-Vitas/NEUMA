import type { UserRole } from '@company-brain/shared';
import type { LucideIcon } from 'lucide-react';

export interface MobileNavItemProps {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly active: boolean;
  readonly onClick?: () => void;
}

export interface MobileNavProps {
  readonly role: UserRole;
  readonly onNavigate?: () => void;
}
