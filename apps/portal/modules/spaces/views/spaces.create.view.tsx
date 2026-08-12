import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { SpacesCreateForm } from '../components/spaces.create.form';

export const SpacesCreateView = async () => {
  const t = await getTranslations('spaces');
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-8 lg:pt-12">
      <PageHeader subtitle={t('createSubtitle')} title={t('createTitle')} />
      <SpacesCreateForm />
    </main>
  );
};
