import { getAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensPersonalView } from '@/modules/access-tokens/views/access-tokens.personal.view';

/** Depends on the session, so it resolves fully before responding. */
export const instant = false;

export default async function Page() {
  const tokens = await getAccessTokens();

  return <AccessTokensPersonalView tokens={tokens.isOk() ? tokens.getValue() : null} />;
}
