import { afterAll, beforeAll, describe, it } from 'bun:test';
import type { AuthSession } from '@neuma/shared';
import request from 'supertest';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

describe('Revoking sessions (Integration)', () => {
  let testApp: TestApp;
  const password = 'plainPassword123';

  const refresh = (refreshToken: string) =>
    request(testApp.getServer()).post('/api/v1/auth/sessions/refresh').send({ refreshToken });

  const newAccount = async (label: string): Promise<{ email: string; session: AuthSession }> => {
    const email = `sessions-${label}-${String(Date.now())}@test.com`;
    const session = await createAccount(testApp, { email, name: 'Sessions User', password });
    return { email, session };
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('renews a session whose refresh token is still current', async () => {
    const { session } = await newAccount('renew');

    await refresh(session.refreshToken).expect(201);
  });

  it('stops renewing every refresh token of the account once the user logs out', async () => {
    const { email, session } = await newAccount('logout');
    const otherDevice = await loginUser(testApp, email, password);

    await request(testApp.getServer())
      .delete('/api/v1/auth/sessions/current')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);

    await refresh(session.refreshToken).expect(401);
    await refresh(otherDevice.refreshToken).expect(401);
    await refresh((await loginUser(testApp, email, password)).refreshToken).expect(201);
  });

  it('stops renewing the old refresh tokens once the password changes', async () => {
    const { email, session } = await newAccount('password');
    const newPassword = 'anotherPassword456';

    await request(testApp.getServer())
      .patch(`/api/v1/users/${session.user.id}/password`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);

    await refresh(session.refreshToken).expect(401);
    await refresh((await loginUser(testApp, email, newPassword)).refreshToken).expect(201);
  });
});
