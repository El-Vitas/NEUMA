import { unstable_rethrow } from 'next/navigation';
import { logger } from '@/lib/logger';

export const withAction = async <T>(
  meta: Record<string, unknown> & { action: string },
  fn: () => Promise<T>,
): Promise<T> => {
  /** Monotonic clock: the right one for a duration. */
  const start = performance.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn();
    logger.info({ ...meta, status: 'success', durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (error) {
    // A redirect or a 404 is Next's own control flow, not a failed action.
    unstable_rethrow(error);
    /** Anything can be thrown, so it is converted to an Error before logging. */
    const wrapped = error instanceof Error ? error : new Error(String(error));
    logger.error({
      ...meta,
      status: 'error',
      error: wrapped.message,
      stack: wrapped.stack,
      durationMs: Math.round(performance.now() - start),
    });
    throw error;
  }
};
