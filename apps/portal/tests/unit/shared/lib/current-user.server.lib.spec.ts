import { describe, expect, it, mock } from 'bun:test';
import type { User } from '@neuma/shared';
import { ApiError } from '@/shared/lib/api';

const apiRequestMock = mock(async (): Promise<User> => {
  throw new Error('not set');
});
const loggerErrorMock = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined, cacheTag: () => undefined }));
mock.module('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'access-token' }) }) }));
mock.module('@/lib/logger', () => ({ logger: { error: loggerErrorMock } }));
mock.module('@/shared/lib/api-server', () => ({ apiRequest: apiRequestMock }));

const { getCurrentUser } = await import('@/shared/server/lib/current-user.server');

const ana: User = { email: 'ana@example.com', id: 'user-1', name: 'Ana', role: 'ADMIN' };

describe('getCurrentUser', () => {
  it('returns the user the backend knows', async () => {
    apiRequestMock.mockImplementationOnce(async () => ana);

    expect(await getCurrentUser()).toEqual(ana);
  });

  it('returns null only when the backend rejects the session', async () => {
    apiRequestMock.mockImplementationOnce(async () => {
      throw new ApiError(401, 'Unauthorized');
    });

    expect(await getCurrentUser()).toBeNull();
  });

  it('logs and fails on a backend error instead of pretending nobody is signed in', async () => {
    loggerErrorMock.mockClear();
    apiRequestMock.mockImplementationOnce(async () => {
      throw new ApiError(500, 'Boom');
    });

    await expect(getCurrentUser()).rejects.toThrow('Boom');
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });
});
