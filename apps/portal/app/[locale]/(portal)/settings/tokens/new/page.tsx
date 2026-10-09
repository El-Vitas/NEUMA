import { notFound } from 'next/navigation';
import { getAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensCreateView } from '@/modules/access-tokens/views/access-tokens.create.view';
import { getReachableSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/**
 * Crear un token depende de quién mira y de lo que ve hoy: se resuelve entero
 * antes de responder, en vez de prometer una navegación instantánea que no existe.
 */
export const instant = false;

export default async function Page() {
  const user = await getCurrentUser();
  if (user === null) notFound();

  const [spaces, tokens] = await Promise.all([getReachableSpaces(), getAccessTokens()]);

  return (
    <AccessTokensCreateView
      role={user.role}
      spaces={spaces.isOk() ? spaces.getValue() : null}
      takenNames={tokens.isOk() ? tokens.getValue().map((token) => token.name) : null}
    />
  );
}
