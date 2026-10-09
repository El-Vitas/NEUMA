import { canManageWorkspace } from '@neuma/shared';
import { notFound } from 'next/navigation';
import { getWorkspaceAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensWorkspaceView } from '@/modules/access-tokens/views/access-tokens.workspace.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/** Admin-only section, missing for other roles. Depends on the session, so it resolves fully before responding. */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();
  if (user === null || !canManageWorkspace(user.role)) notFound();

  const tokens = await getWorkspaceAccessTokens();

  return <AccessTokensWorkspaceView tokens={tokens.isOk() ? tokens.getValue() : null} />;
}
