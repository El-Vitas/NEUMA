import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PortalView } from '@/modules/portal/views/portal.view';

export default async function Page() {
  const user = await getCurrentUser();

  return <PortalView userName={user?.name ?? null} />;
}
