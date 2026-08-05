import { getTranslations } from 'next-intl/server';
import { Button } from '@/shared/components/ui/button';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../i18n/navigation';
import { SpacesList } from '../components/spaces.list';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly canCreate: boolean;
  readonly spaces: readonly SpaceSummary[] | null;
}

export const SpacesView = async ({ canCreate, spaces }: IProps) => {
  const t = await getTranslations('spaces');
  const common = await getTranslations('common');
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-8 lg:pt-12">
      <PageHeader
        action={
          canCreate ? (
            <Button asChild className="min-h-11">
              <Link href={ROUTES.PORTAL_SPACES_NEW}>{t('newSpace')}</Link>
            </Button>
          ) : undefined
        }
        subtitle={t('subtitle')}
        title={t('title')}
      />
      {spaces === null ? (
        <div className="space-y-4">
          <FormErrorBanner message={t('loadError')} />
          <Button asChild className="min-h-11" variant="outline">
            <Link href={ROUTES.PORTAL_SPACES}>{common('retry')}</Link>
          </Button>
        </div>
      ) : (
        <SpacesList canCreate={canCreate} spaces={spaces} />
      )}
    </main>
  );
};
