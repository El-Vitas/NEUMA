import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { ListEmptyState } from '@/shared/components/ui/list-empty-state';
import { ListRow } from '@/shared/components/ui/list-row';
import { ListRowGroup } from '@/shared/components/ui/list-row-group';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../i18n/navigation';
import type { SpaceSummary } from '../types/spaces.types';
import { SpacesVisibilityBadge } from './spaces.visibility.badge';

interface IProps {
  readonly canCreate: boolean;
  readonly spaces: readonly SpaceSummary[];
}

export const SpacesList = ({ canCreate, spaces }: IProps) => {
  const t = useTranslations('spaces');
  if (spaces.length === 0) {
    return (
      <ListEmptyState
        action={
          canCreate ? (
            <Button asChild className="min-h-11">
              <Link href={ROUTES.PORTAL_SPACES_NEW}>{t('create')}</Link>
            </Button>
          ) : undefined
        }
        message={t('empty')}
      />
    );
  }

  return (
    <ListRowGroup ariaLabel={t('available')}>
      {spaces.map((space) => (
        <ListRow
          href={ROUTES.PORTAL_SPACE(space.id)}
          key={space.id}
          secondary={`/${space.slug}`}
          title={space.name}
          trailing={<SpacesVisibilityBadge visibility={space.visibility} />}
        />
      ))}
    </ListRowGroup>
  );
};
