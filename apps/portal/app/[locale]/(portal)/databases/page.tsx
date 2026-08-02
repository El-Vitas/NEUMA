import { WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { canManageDatabases } from '@/modules/databases/lib/databases.lib';
import { getDatabases } from '@/modules/databases/server/queries/databases.queries';
import { DatabasesView } from '@/modules/databases/views/databases.view';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';

export default async function Page() {
  const [databasesResult, spacesResult, user] = await Promise.all([getDatabases(), getSpaces(), getCurrentUser()]);
  const capability = user === null ? 'viewer' : WORKSPACE_CAPABILITY_BY_ROLE[user.role];

  return (
    <DatabasesView
      canManage={canManageDatabases(capability)}
      databases={databasesResult.isOk() ? databasesResult.getValue() : null}
      spaces={spacesResult.isOk() ? spacesResult.getValue().map(({ id, name }) => ({ id, name })) : []}
    />
  );
}
