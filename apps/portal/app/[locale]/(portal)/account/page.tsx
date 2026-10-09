import { AccountView } from '@/modules/account/views/account.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/**
 * La cuenta es de quien mira: se resuelve entera antes de responder, en vez de
 * prometer una navegación instantánea que no existe.
 */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();

  return <AccountView user={user} />;
}
