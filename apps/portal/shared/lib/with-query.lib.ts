import { Result } from '@neuma/shared';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { logger } from '@/lib/logger';
import { isSessionRejected } from '@/shared/lib/api-server';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { requireAccessTokenCookie } from './auth.token.lib';

// Next signals a redirect, a 404 or the end of a prerender by throwing; those belong to Next, not to the query.
const logQueryFailure = (meta: { op: string; params?: unknown }, error: unknown, durationMs?: number): Error => {
  unstable_rethrow(error);
  const wrapped = error instanceof Error ? error : new Error(String(error));
  logger.error({ ...meta, status: 'error', error: wrapped.message, stack: wrapped.stack, durationMs });
  return wrapped;
};

/** An expired session is not a failed query: the visitor goes to the login and nothing is logged as an error. */
const leaveIfSessionRejected = async (accessToken: string): Promise<void> => {
  if (await isSessionRejected(accessToken)) {
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
  }
};

export const withQuery = async <T>(
  meta: { op: string; params?: unknown },
  fn: (accessToken: string) => Promise<T>,
): Promise<Result<T, Error>> => {
  // Each log line carries the wall-clock time, which Next only allows once the page is rendering for a request.
  await connection();
  let accessToken: string;
  try {
    accessToken = await requireAccessTokenCookie();
  } catch (error) {
    return Result.fail(logQueryFailure(meta, error));
  }

  const start = performance.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn(accessToken);
    logger.info({ ...meta, status: 'success', durationMs: Math.round(performance.now() - start) });
    return Result.ok(result);
  } catch (error) {
    unstable_rethrow(error);
    await leaveIfSessionRejected(accessToken);
    return Result.fail(logQueryFailure(meta, error, Math.round(performance.now() - start)));
  }
};
