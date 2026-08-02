import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { SpacesList } from '../components/spaces.list';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly spaces: readonly SpaceSummary[] | null;
}

export const SpacesView = ({ spaces }: IProps) => (
  <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <PageHeader subtitle="Consulta el conocimiento interno de tu organización" title="Espacios" />
    {spaces === null ? (
      <FormErrorBanner message="No se pudieron cargar los espacios. Intenta de nuevo." />
    ) : (
      <SpacesList spaces={spaces} />
    )}
  </main>
);
