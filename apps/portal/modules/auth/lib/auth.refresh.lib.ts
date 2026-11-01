import { config } from '@/shared/config';
import { FORWARDED_FOR_HEADER } from '@/shared/constants/client-ip.constants';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { REFRESH_REJECTED_STATUSES, REFRESH_REQUEST_TIMEOUT_MILLISECONDS } from '../constants/auth.refresh.constants';
import { authSessionSchema } from '../schemas/auth.schemas';
import type { RefreshOutcome } from '../types/auth.types';

const refreshesInFlight = new Map<string, Promise<RefreshOutcome>>();

const buildRefreshHeaders = (clientIp: string | undefined): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(clientIp === undefined ? {} : { [FORWARDED_FOR_HEADER]: clientIp }),
});

const readOutcome = async (response: Response): Promise<RefreshOutcome> => {
  if (response.ok) {
    const parsed = authSessionSchema.safeParse(await response.json());
    return parsed.success ? { session: parsed.data, status: 'renewed' } : { status: 'unavailable' };
  }
  return REFRESH_REJECTED_STATUSES.includes(response.status) ? { status: 'rejected' } : { status: 'unavailable' };
};

const requestRefresh = async (refreshToken: string, clientIp: string | undefined): Promise<RefreshOutcome> => {
  try {
    const response = await fetch(`${config.backendApiUrl}${API_ROUTES.AUTH_SESSIONS_REFRESH}`, {
      body: JSON.stringify({ refreshToken }),
      headers: buildRefreshHeaders(clientIp),
      method: 'POST',
      signal: AbortSignal.timeout(REFRESH_REQUEST_TIMEOUT_MILLISECONDS),
    });
    return await readOutcome(response);
  } catch {
    return { status: 'unavailable' };
  }
};

/**
 * Bypasses `apiServer` on purpose: this runs while routing, where there is no session yet and cookies must not be
 * touched. Only the backend saying the token is bad is a rejection; throttling or an outage is not, so a valid user
 * is not sent to the login form. Parallel requests of one person share a single call.
 */
export const refreshSession = (refreshToken: string, clientIp: string | undefined): Promise<RefreshOutcome> => {
  const running = refreshesInFlight.get(refreshToken);
  if (running !== undefined) return running;
  const started = requestRefresh(refreshToken, clientIp).finally(() => refreshesInFlight.delete(refreshToken));
  refreshesInFlight.set(refreshToken, started);
  return started;
};
