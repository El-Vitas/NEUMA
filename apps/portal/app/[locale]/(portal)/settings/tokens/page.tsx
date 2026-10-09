import { getAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensPersonalView } from '@/modules/access-tokens/views/access-tokens.personal.view';

/**
 * Los tokens son de quien mira: se resuelven enteros antes de responder, en vez
 * de prometer una navegación instantánea que no existe.
 */
export const instant = false;

export default async function Page() {
  const tokens = await getAccessTokens();

  return <AccessTokensPersonalView tokens={tokens.isOk() ? tokens.getValue() : null} />;
}
