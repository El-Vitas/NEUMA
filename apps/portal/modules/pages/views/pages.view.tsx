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

export const PagesView = ({ canEditContent, pages, spaceId, spaceName }: IProps) => (
  <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <PageHeader subtitle="Páginas y conocimiento estructurado" title={spaceName} />
    {pages === null ? (
      <FormErrorBanner message="No se pudo cargar este espacio. Comprueba tus permisos e inténtalo de nuevo." />
    ) : (
      <PagesWorkspace canEditContent={canEditContent} pages={pages} spaceId={spaceId} />
    )}
  </main>
);
