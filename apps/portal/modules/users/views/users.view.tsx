import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { UsersTable } from '../components/users.table';
import type { UsersList, UsersListParams } from '../types/users.types';

interface IProps {
  readonly users: UsersList | null;
  readonly params: UsersListParams;
}

export const UsersView = async ({ users, params }: IProps) => {
  const t = await getTranslations('users');
  if (users === null) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader subtitle={t('subtitle')} title={t('title')} />
        <FormErrorBanner message={t('loadError')} />
      </div>
    );
  }

  return (
    <UsersTable
      items={users.items}
      page={users.page}
      pageSize={users.pageSize}
      search={params.search}
      total={users.total}
    />
  );
};
