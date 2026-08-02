import { Badge } from '@/shared/components/ui/badge';
import { USER_STATUS_LABELS } from '../constants/users.constants';

interface IProps {
  readonly isActive: boolean;
}

export const UsersStatusBadge = ({ isActive }: IProps) => (
  <Badge variant={isActive ? 'success' : 'outline'}>
    {isActive ? USER_STATUS_LABELS.ACTIVE : USER_STATUS_LABELS.INACTIVE}
  </Badge>
);
