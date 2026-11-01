import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { BlockLiveTokenService } from '@/modules/blocks/block.live.token.service';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface UserListResponse {
  items: { email: string; id: string; name: string }[];
  page: number;
  pageSize: number;
  total: number;
}

describe('Users Module (Integration)', () => {
  const password = 'plainPassword123';
  let testApp: TestApp;
  let adminToken: string;
  let clientToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    adminEmail = `list-admin-${String(timestamp)}@test.com`;
    const clientEmail = `list-client-${String(timestamp)}@test.com`;

    await createAccount(testApp, { email: adminEmail, name: 'List Admin', password });
    const clientSession = await createAccount(testApp, { email: clientEmail, name: 'List Client', password });
    clientToken = clientSession.accessToken;

    const prisma = testApp.get(PrismaService);
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    const adminSession = await loginUser(testApp, adminEmail, password);
    adminToken = adminSession.accessToken;
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('POST /api/v1/users', () => {
    it('lets an admin create an account with the role they choose, without handing them its session', async () => {
      const payload = {
        email: `created-${String(Date.now())}@test.com`,
        name: 'Created Worker',
        password,
        role: USER_ROLE.WORKER,
      };

      const response = await request(testApp.getServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const body = response.body as Record<string, unknown>;
      expect(body).toMatchObject({ email: payload.email, name: payload.name, role: USER_ROLE.WORKER });
      expect(body.accessToken).toBeUndefined();
      const session = await loginUser(testApp, payload.email, password);
      expect(session.user.role).toBe(USER_ROLE.WORKER);
    });

    it('refuses anyone who is not signed in, so nobody can let themselves in', async () => {
      await request(testApp.getServer())
        .post('/api/v1/users')
        .send({ email: `outsider-${String(Date.now())}@test.com`, name: 'Outsider', password, role: USER_ROLE.CLIENT })
        .expect(401);
    });

    it('refuses a signed-in user who does not administer accounts', async () => {
      await request(testApp.getServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ email: `peer-${String(Date.now())}@test.com`, name: 'Peer', password, role: USER_ROLE.CLIENT })
        .expect(403);
    });

    it('refuses an email that already has an account', async () => {
      const response = await request(testApp.getServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: adminEmail, name: 'Twin', password, role: USER_ROLE.CLIENT })
        .expect(409);

      expect((response.body as { error?: { code: string } }).error?.code).toBe('USER_EMAIL_ALREADY_IN_USE');
    });

    it('should reject invalid payload with 400', async () => {
      const response = await request(testApp.getServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email', name: '', password: '123', role: 'OWNER' })
        .expect(400);

      const body = response.body as { error?: { code: string } };
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    // Each endpoint has its own counter: if the export cap (5 per minute) applied to sign-in, a sixth person in an
    // office would be locked out without exporting anything.
    it('does not count signing in against the export allowance', async () => {
      const email = `throttle-${String(Date.now())}@test.com`;
      await createAccount(testApp, { email, name: 'Throttle User', password });

      for (let attempt = 0; attempt < 6; attempt += 1) {
        await loginUser(testApp, email, password);
      }
    });
  });

  describe('creating the first admin', () => {
    it('refuses once an admin exists, so the command cannot hand out a second way in', async () => {
      const result = await testApp.get(UsersService).createFirstAdmin({
        email: `second-admin-${String(Date.now())}@test.com`,
        name: 'Second Admin',
        password,
      });

      expect(result.isFail()).toBe(true);
      expect(result.getError().code).toBe('USER_ADMIN_ALREADY_EXISTS');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return a paginated user list for an admin', async () => {
      const response = await request(testApp.getServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as UserListResponse;
      expect(body.page).toBe(1);
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by search matching the email', async () => {
      const response = await request(testApp.getServer())
        .get('/api/v1/users')
        .query({ search: adminEmail })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as UserListResponse;
      expect(body.total).toBe(1);
      expect(body.items[0]?.email).toBe(adminEmail);
    });

    it('should reject a non-admin user with 403', async () => {
      await request(testApp.getServer()).get('/api/v1/users').set('Authorization', `Bearer ${clientToken}`).expect(403);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(testApp.getServer()).get('/api/v1/users').expect(401);
    });

    it('rejects a refresh token and a live channel token presented as an access token', async () => {
      const session = await loginUser(testApp, adminEmail, password);
      const liveChannelToken = await testApp
        .get(BlockLiveTokenService)
        .mint({ role: session.user.role, userId: session.user.id, workspaceId: 'workspace-1' });

      for (const token of [session.refreshToken, liveChannelToken]) {
        await request(testApp.getServer()).get('/api/v1/users').set('Authorization', `Bearer ${token}`).expect(401);
      }
    });
  });
});
