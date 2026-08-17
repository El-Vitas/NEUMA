import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PagesWorkspace } from '../components/pages.workspace';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly canEditContent: boolean;
  readonly currentUserDisplayName?: string;
  readonly isNewPage?: boolean;
  readonly pages: readonly PageSummary[] | null;
  readonly spaceId: string;
  readonly spaceName: string;
}

export const PagesView = async ({
  canEditContent,
  currentUserDisplayName,
  isNewPage = false,
  pages,
  spaceId,
  spaceName,
}: IProps) => {
  const t = await getTranslations('pages');
  return (
    <main className="min-h-full">
      {pages === null ? (
        <div className="p-4 sm:p-6">
          <FormErrorBanner message={t('loadError')} />
        </div>
      ) : (
        <PagesWorkspace
          canEditContent={canEditContent}
          currentUserDisplayName={currentUserDisplayName}
          isNewPage={isNewPage}
          pages={pages}
          spaceId={spaceId}
          spaceName={spaceName}
        />
      )}
    </main>
  );
};
