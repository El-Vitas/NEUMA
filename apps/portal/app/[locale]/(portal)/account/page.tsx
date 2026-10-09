import { AccountView } from '@/modules/account/views/account.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/** Depends on the session, so it resolves fully before responding. */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();

  return <AccountView user={user} />;
}
