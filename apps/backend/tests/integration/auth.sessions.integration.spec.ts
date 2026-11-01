import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { AuthSession } from '@neuma/shared';
import request from 'supertest';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const MINUTE_MS = 60_000;

/**
 * Renewals go through the service: the credentials throttle allows 20 requests a minute per address, which this
 * file's logins nearly use up. One test goes over HTTP to cover the route and its status codes.
 */
describe('Rotating and revoking sessions (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  const password = 'plainPassword123';

  const tryRefresh = (refreshToken: string) => testApp.get(AuthService).refreshSession(refreshToken);

  const refresh = async (refreshToken: string): Promise<AuthSession> => {
    const result = await tryRefresh(refreshToken);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  };

  const expectRefused = async (refreshToken: string): Promise<void> => {
    expect((await tryRefresh(refreshToken)).isFail()).toBe(true);
  };

  const readTokenId = (token: string): string => {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      jti: string;
    };
    return payload.jti;
  };

  const newAccount = async (label: string): Promise<{ email: string; session: AuthSession }> => {
    const email = `sessions-${label}-${String(Date.now())}@test.com`;
    const session = await createAccount(testApp, { email, name: 'Sessions User', password });
    return { email, session };
  };

  const rowsOf = (userId: string) => prisma.models.RefreshSession.where({ userId }).all();

  /** Moves the use into the past so the request is a real reuse, not a double-send inside the grace window. */
  const ageUse = async (refreshToken: string): Promise<void> => {
    await prisma.models.RefreshSession.where({ id: readTokenId(refreshToken) }).update({
      usedAt: new Date(Date.now() - MINUTE_MS),
    });
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('renews over HTTP with a new pair and answers 401 for a token it does not know', async () => {
    const { session } = await newAccount('renew');

    const renewed = (
      await request(testApp.getServer())
        .post('/api/v1/auth/sessions/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(201)
    ).body as AuthSession;

    expect(renewed.refreshToken).not.toBe(session.refreshToken);
    expect(readTokenId(renewed.refreshToken)).not.toBe(readTokenId(session.refreshToken));
    await expectRefused(`${session.refreshToken}tampered`);
    await refresh(renewed.refreshToken);
  });

  it('stops accepting the old refresh token once it was used and the grace window passed', async () => {
    const { session } = await newAccount('stale');
    await refresh(session.refreshToken);
    await ageUse(session.refreshToken);

    await expectRefused(session.refreshToken);
  });

  it('revokes the whole family when a used token comes back, and leaves other devices signed in', async () => {
    const { email, session } = await newAccount('reuse');
    const otherDevice = await loginUser(testApp, email, password);
    const renewed = await refresh(session.refreshToken);
    await ageUse(session.refreshToken);

    await expectRefused(session.refreshToken);

    await expectRefused(renewed.refreshToken);
    await refresh(otherDevice.refreshToken);
  });

  it('gives a double-send inside the grace window the same successor and keeps the family', async () => {
    const { session } = await newAccount('grace');

    const first = await refresh(session.refreshToken);
    const second = await refresh(session.refreshToken);

    expect(second.refreshToken).toBe(first.refreshToken);
    expect(await rowsOf(session.user.id)).toHaveLength(2);
    await refresh(first.refreshToken);
  });

  it('rotates once when the same token is sent in parallel', async () => {
    const { session } = await newAccount('race');

    const results = await Promise.all(Array.from({ length: 5 }, () => tryRefresh(session.refreshToken)));

    expect(results.every((result) => result.isOk())).toBe(true);
    expect(await rowsOf(session.user.id)).toHaveLength(2);
    const refreshTokens = new Set(results.map((result) => result.getValue().refreshToken));
    expect(refreshTokens.size).toBe(1);
  });

  it('refuses a refresh token whose row has expired', async () => {
    const { session } = await newAccount('expired');
    await prisma.models.RefreshSession.where({ id: readTokenId(session.refreshToken) }).update({
      expiresAt: new Date(Date.now() - MINUTE_MS),
    });

    await expectRefused(session.refreshToken);
  });

  it('deletes expired rows and keeps the rest', async () => {
    const { session } = await newAccount('purge');
    const expiredId = readTokenId(session.refreshToken);
    await prisma.models.RefreshSession.where({ id: expiredId }).update({
      expiresAt: new Date(Date.now() - MINUTE_MS),
    });
    const live = await loginUser(testApp, session.user.email, password);

    const deleted = await testApp.get(AuthService).purgeExpiredRefreshSessions(new Date());

    expect(deleted).toBeGreaterThanOrEqual(1);
    const remaining = (await rowsOf(session.user.id)).map((row) => row.id);
    expect(remaining).not.toContain(expiredId);
    expect(remaining).toContain(readTokenId(live.refreshToken));
  });

  it('revokes only the family of the session that logs out', async () => {
    const { email, session } = await newAccount('logout');
    const otherDevice = await loginUser(testApp, email, password);

    await request(testApp.getServer())
      .delete('/api/v1/auth/sessions/current')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);

    await expectRefused(session.refreshToken);
    await refresh(otherDevice.refreshToken);
  });

  it('revokes every family of the account once the password changes', async () => {
    const { email, session } = await newAccount('password');
    const otherDevice = await loginUser(testApp, email, password);
    const newPassword = 'anotherPassword456';

    await request(testApp.getServer())
      .patch(`/api/v1/users/${session.user.id}/password`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);

    expect(await rowsOf(session.user.id)).toHaveLength(0);
    await expectRefused(session.refreshToken);
    await expectRefused(otherDevice.refreshToken);
    await refresh((await loginUser(testApp, email, newPassword)).refreshToken);
  });
});
