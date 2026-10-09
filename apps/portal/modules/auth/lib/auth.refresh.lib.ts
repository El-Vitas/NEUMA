import { config } from '@/shared/config';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { authSessionSchema } from '../schemas/auth.schemas';
import type { AuthSession } from '../types/auth.types';

/**
 * Bypasses `apiServer` on purpose: this runs while routing, where there is no session yet, a rejection must
 * return `null` instead of redirecting, and cookies must not be touched.
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
