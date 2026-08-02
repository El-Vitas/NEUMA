import { getDatabase, getDatabaseRecords } from '@/modules/databases/server/queries/databases.queries';
import { DatabasesDetailView } from '@/modules/databases/views/databases.detail.view';

interface IProps {
  readonly params: Promise<{ databaseId: string }>;
}

export default async function Page({ params }: IProps) {
  const { databaseId } = await params;
  const [databaseResult, recordsResult] = await Promise.all([getDatabase(databaseId), getDatabaseRecords(databaseId)]);

  return (
    <DatabasesDetailView
      database={databaseResult.isOk() ? databaseResult.getValue() : null}
      records={recordsResult.isOk() ? recordsResult.getValue() : null}
    />
  );
}
