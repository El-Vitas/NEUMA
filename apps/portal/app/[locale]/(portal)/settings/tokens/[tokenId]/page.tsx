import { notFound } from 'next/navigation';
import { getAccessTokens } from '@/modules/access-tokens/server/queries/access-tokens.queries';
import { AccessTokensEditView } from '@/modules/access-tokens/views/access-tokens.edit.view';
import { getReachableSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly params: Promise<{ tokenId: string }>;
}

/** Looks the token up among the viewer's own, so another user's token counts as missing. Depends on the session. */
export const instant = false;

export default async function Page({ params }: IProps) {
  const [{ tokenId }, user] = await Promise.all([params, getCurrentUser()]);
  if (user === null) notFound();

  const [spaces, tokens] = await Promise.all([getReachableSpaces(), getAccessTokens()]);
  if (tokens.isFail()) throw tokens.getError();

  const token = tokens.getValue().find((candidate) => candidate.id === tokenId);
  if (token === undefined) notFound();

  return <AccessTokensEditView role={user.role} spaces={spaces.isOk() ? spaces.getValue() : null} token={token} />;
}
