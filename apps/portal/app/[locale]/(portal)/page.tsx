import { PortalView } from '@/modules/portal/views/portal.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

export default async function Page() {
  const user = await getCurrentUser();

  return <PortalView userName={user?.name ?? null} />;
}
