import { config } from '@/shared/config';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { authSessionSchema } from '../schemas/auth.schemas';
import type { AuthSession } from '../types/auth.types';

/**
 * Trades a refresh token for a fresh session straight against the API.
 *
 * It does not go through `apiServer` on purpose: this runs while routing a
 * request, where there is no session to read yet, a rejection must be answered
 * with `null` instead of a redirect, and nothing may reach for cookies.
 */
export const refreshSession = async (refreshToken: string): Promise<AuthSession | null> => {
  try {
    const response = await fetch(`${config.backendApiUrl}${API_ROUTES.AUTH_SESSIONS_REFRESH}`, {
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) return null;
    return authSessionSchema.parse(await response.json());
  } catch {
    return null;
  }
};
