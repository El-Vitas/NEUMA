import { LockKeyhole, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';
import type { SpaceVisibility } from '../types/spaces.types';

interface IProps {
  readonly visibility: SpaceVisibility;
}

export const SpacesVisibilityBadge = ({ visibility }: IProps) => {
  const t = useTranslations('spaces');
  const isRestricted = visibility === 'RESTRICTED';

  return (
    <Badge className="shrink-0" variant={isRestricted ? 'warning' : 'secondary'}>
      {isRestricted ? <LockKeyhole aria-hidden="true" /> : <Users aria-hidden="true" />}
      {isRestricted ? t('visibility.restricted') : t('visibility.internal')}
    </Badge>
  );
};
