import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { PagesWorkspace } from '../components/pages.workspace';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly canEditContent: boolean;
  readonly pages: readonly PageSummary[] | null;
  readonly spaceId: string;
  readonly spaceName: string;
}

export const PagesView = async ({ canEditContent, pages, spaceId, spaceName }: IProps) => {
  const t = await getTranslations('pages');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader subtitle={t('subtitle')} title={spaceName} />
      {pages === null ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <PagesWorkspace canEditContent={canEditContent} pages={pages} spaceId={spaceId} />
      )}
    </main>
  );
};
