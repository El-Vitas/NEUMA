import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';

interface IProps {
  readonly isActive: boolean;
}

export const UsersStatusBadge = ({ isActive }: IProps) => {
  const t = useTranslations('users.statusValues');
  return <Badge variant={isActive ? 'success' : 'outline'}>{isActive ? t('active') : t('inactive')}</Badge>;
};
