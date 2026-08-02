import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { SpacesList } from '../components/spaces.list';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly spaces: readonly SpaceSummary[] | null;
}

export const SpacesView = async ({ spaces }: IProps) => {
  const t = await getTranslations('spaces');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      {spaces === null ? <FormErrorBanner message={t('loadError')} /> : <SpacesList spaces={spaces} />}
    </main>
  );
};
