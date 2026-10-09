import type { UserRole } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';
import { USER_ROLE_BADGE_VARIANTS } from '../constants/users.constants';

interface IProps {
  readonly role: UserRole;
}

export const UsersRoleBadge = ({ role }: IProps) => {
  const t = useTranslations('users.roles');
  return <Badge variant={USER_ROLE_BADGE_VARIANTS[role]}>{t(role)}</Badge>;
};
