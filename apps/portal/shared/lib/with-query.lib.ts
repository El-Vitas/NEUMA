import { Result } from '@company-brain/shared';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';

const getAccessToken = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
};

export const withQuery = async <T>(
  meta: { op: string; params?: unknown },
  fn: (accessToken: string) => Promise<T>,
): Promise<Result<T, Error>> => {
  const accessToken = await getAccessToken();
  const start = Date.now();
  logger.info({ ...meta, status: 'start' });

  try {
    const result = await fn(accessToken);
    logger.info({ ...meta, status: 'success', durationMs: Date.now() - start });
    return Result.ok(result);
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    logger.error({
      ...meta,
      status: 'error',
      error: wrapped.message,
      stack: wrapped.stack,
      durationMs: Date.now() - start,
    });
    return Result.fail(wrapped);
  }
};
