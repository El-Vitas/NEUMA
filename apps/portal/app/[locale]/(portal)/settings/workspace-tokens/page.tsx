import { USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getWorkspaceAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensWorkspaceView } from '@/modules/access-tokens/views/access-tokens.workspace.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/**
 * Los tokens de todo el espacio de trabajo son de quien administra. Para el
 * resto esta sección no existe. Se resuelve entero antes de responder, porque
 * depende de la sesión.
 */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();
  if (user?.role !== USER_ROLE.ADMIN) notFound();

  const tokens = await getWorkspaceAccessTokens();

  return <AccessTokensWorkspaceView tokens={tokens.isOk() ? tokens.getValue() : null} />;
}
