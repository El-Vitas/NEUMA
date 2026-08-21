import 'server-only';

import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

export const authenticatedRequest = async <T>(endpoint: string, method: string, body: unknown): Promise<T> => {
  const accessToken = await requireAccessTokenCookie();
  return apiRequest<T>(endpoint, accessToken, {
    body: JSON.stringify(body),
    headers: { 'x-mutation-id': crypto.randomUUID() },
    method,
  });
};
