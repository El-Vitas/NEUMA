import { logger } from '@/lib/logger';

export const withAction = async <T>(
  meta: Record<string, unknown> & { action: string },
  fn: () => Promise<T>,
): Promise<T> => {
  /** Cuánto tardó, no qué hora era: para una duración, el reloj monótono es el correcto. */
  const start = performance.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn();
    logger.info({ ...meta, status: 'success', durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (error) {
    /** Anything can be thrown, so what is written down has to be made into an error first. */
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
