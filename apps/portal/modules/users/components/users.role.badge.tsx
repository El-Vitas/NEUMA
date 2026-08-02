import type { UserRole } from '@company-brain/shared';
import { Badge } from '@/shared/components/ui/badge';
import { roleLabel } from '@/shared/lib/profile.lib';
import { USER_ROLE_BADGE_VARIANTS } from '../constants/users.constants';

interface IProps {
  readonly role: UserRole;
}

export const UsersRoleBadge = ({ role }: IProps) => (
  <Badge variant={USER_ROLE_BADGE_VARIANTS[role]}>{roleLabel(role)}</Badge>
);
