import { PortalView } from '@/modules/portal/views/portal.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/**
 * El saludo es para quien mira: se resuelve entero antes de responder, en vez
 * de prometer una navegación instantánea que no existe.
 */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();

  return <PortalView userName={user?.name ?? null} />;
}
