import { describe, expect, it, mock } from 'bun:test';
import { createSafeActionMock } from '../../../mocks/safe-action.mock';

const patchMock = mock(async (_endpoint: string, _body: unknown): Promise<undefined> => undefined);
const signInMock = mock(async (_input: unknown): Promise<{ status: string }> => ({ status: 'signedIn' }));

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: () => undefined }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));
mock.module('@/shared/lib/api-server', () => ({ apiServer: { patch: patchMock, patchDiscardingBody: patchMock } }));
mock.module('@/modules/auth/server/lib/auth.server', () => ({ signInAgainOrReleaseSession: signInMock }));
mock.module('@/modules/account/server/lib/account.owner.server', () => ({
  requireOwnAccount: async () => ({ email: 'ana@example.com', id: 'user-1' }),
  requireOwnAccountId: async () => 'user-1',
}));

const { updatePasswordAction } = await import('@/modules/account/server/actions/profile.actions');

const input = { currentPassword: 'old-password', newPassword: 'new-password-1' };

describe('updatePasswordAction', () => {
  it('signs in again with the new password and reports it', async () => {
    signInMock.mockClear();

    const result = await updatePasswordAction(input);

    expect(result?.data).toEqual({ status: 'signedIn' });
    expect(signInMock).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'new-password-1' });
  });

  it('passes on that the person must sign in when the new session could not start', async () => {
    signInMock.mockImplementationOnce(async () => ({ status: 'signInRequired' }));

    const result = await updatePasswordAction(input);

    expect(result?.serverError).toBeUndefined();
    expect(result?.data).toEqual({ status: 'signInRequired' });
  });

  it('still fails when the password itself was refused', async () => {
    signInMock.mockClear();
    patchMock.mockImplementationOnce(async () => {
      throw new Error('wrong current password');
    });

    const result = await updatePasswordAction(input);

    expect(result?.serverError).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
  });
});
