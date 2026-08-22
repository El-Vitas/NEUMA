import 'server-only';

import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

/**
 * A change asked of the backend on behalf of whoever is signed in.
 *
 * Every change carries a name of its own so the backend can tell one from
 * another when the same page is written twice, which is why this lives in one
 * place: a copy that forgets the name looks identical and behaves differently.
 */
export const authenticatedRequest = async <T>(endpoint: string, method: string, body: unknown): Promise<T> => {
  const accessToken = await requireAccessTokenCookie();
  return apiRequest<T>(endpoint, accessToken, {
    body: JSON.stringify(body),
    headers: { 'x-mutation-id': crypto.randomUUID() },
    method,
  });
};
