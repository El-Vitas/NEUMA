import { PortalView } from '@/modules/portal/views/portal.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/** Depends on the session, so it resolves fully before responding. */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();

  return <PortalView userName={user?.name ?? null} />;
}
