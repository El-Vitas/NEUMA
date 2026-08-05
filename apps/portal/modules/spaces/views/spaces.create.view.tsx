import { getTranslations } from 'next-intl/server';
import { BackButton } from '@/shared/components/ui/back-button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SpacesCreateForm } from '../components/spaces.create.form';

export const SpacesCreateView = async () => {
  const t = await getTranslations('spaces');
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-8 lg:pt-12">
      <BackButton href={ROUTES.PORTAL_SPACES} />
      <PageHeader subtitle={t('createSubtitle')} title={t('createTitle')} />
      <SpacesCreateForm />
    </main>
  );
};
