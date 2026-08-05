import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { DatabasesCreateForm } from '../components/databases.create.form';
import { DatabasesList } from '../components/databases.list';
import type { DatabaseSpaceOption, DatabaseSummary } from '../types/databases.types';

interface IProps {
  readonly databases: readonly DatabaseSummary[] | null;
  readonly canManage: boolean;
  readonly spaces: readonly DatabaseSpaceOption[];
}

export const DatabasesView = async ({ canManage, databases, spaces }: IProps) => {
  const t = await getTranslations('databases');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        action={canManage ? <DatabasesCreateForm spaces={spaces} /> : undefined}
        subtitle={t('subtitle')}
        title={t('title')}
      />
      {databases === null ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <DatabasesList canManage={canManage} databases={databases} spaces={spaces} />
      )}
    </main>
  );
};
