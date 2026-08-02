import { logger } from '@/lib/logger';

export const withAction = async <T>(
  meta: Record<string, unknown> & { action: string },
  fn: () => Promise<T>,
): Promise<T> => {
  const start = Date.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn();
    logger.info({ ...meta, status: 'success', durationMs: Date.now() - start });
    return result;
  } catch (error) {
    logger.error({
      ...meta,
      status: 'error',
      error: (error as Error).message,
      stack: (error as Error).stack,
      durationMs: Date.now() - start,
    });
    throw error;
  }
};
