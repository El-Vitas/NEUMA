import { AccountView } from '@/modules/account/views/account.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

export default async function Page() {
  const user = await getCurrentUser();

  return <AccountView user={user} />;
}
