import { Result } from '@company-brain/shared';
import { logger } from '@/lib/logger';
import { requireAccessTokenCookie } from './auth.token.lib';

const logQueryFailure = (meta: { op: string; params?: unknown }, error: unknown, durationMs?: number): Error => {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  logger.error({ ...meta, status: 'error', error: wrapped.message, stack: wrapped.stack, durationMs });
  return wrapped;
};

export const withQuery = async <T>(
  meta: { op: string; params?: unknown },
  fn: (accessToken: string) => Promise<T>,
): Promise<Result<T, Error>> => {
  let accessToken: string;
  try {
    accessToken = await requireAccessTokenCookie();
  } catch (error) {
    return Result.fail(logQueryFailure(meta, error));
  }

  /**
   * Cuánto tardó, no qué hora era. Medir con el reloj de pared obliga a resolver
   * la página en el momento —el marco no puede adelantar nada que dependa de la
   * hora—, y para una duración el reloj monótono es además el correcto.
   */
  const start = performance.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn(accessToken);
    logger.info({ ...meta, status: 'success', durationMs: Math.round(performance.now() - start) });
    return Result.ok(result);
  } catch (error) {
    return Result.fail(logQueryFailure(meta, error, Math.round(performance.now() - start)));
  }
};
