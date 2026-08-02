import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';
import { UsersTable } from '../components/users.table';
import type { UsersList, UsersListParams } from '../types/users.types';

interface IProps {
  readonly users: UsersList | null;
  readonly params: UsersListParams;
}

export const UsersView = ({ users, params }: IProps) => {
  if (users === null) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader subtitle="Administra los usuarios del sistema" title="Usuarios" />
        <FormErrorBanner message="No se pudieron cargar los usuarios. Intenta de nuevo." />
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
