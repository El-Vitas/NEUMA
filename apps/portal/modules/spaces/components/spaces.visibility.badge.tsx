import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';
import { resolveSpaceBadgeVariant } from '../lib/spaces.lib';
import type { SpaceVisibility } from '../types/spaces.types';
import { SpacesVisibilityIcon } from './spaces.visibility.icon';

interface IProps {
  readonly visibility: SpaceVisibility;
}

export const SpacesVisibilityBadge = ({ visibility }: IProps) => {
  const t = useTranslations('spaces');

  const label = (() => {
    switch (visibility) {
      case 'RESTRICTED':
        return t('visibility.restricted');
      case 'PRIVATE':
        return t('privacy.badgeLabel');
      default:
        return t('visibility.internal');
    }
  })();

  return (
    <Badge className="shrink-0" variant={resolveSpaceBadgeVariant(visibility)}>
      <SpacesVisibilityIcon visibility={visibility} />
      {label}
    </Badge>
  );
};
