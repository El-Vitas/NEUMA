import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { AuthSession } from '@company-brain/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface UserListResponse {
  items: { email: string; id: string; name: string }[];
  page: number;
  pageSize: number;
  total: number;
}

const registerUser = async (
  testApp: TestApp,
  payload: { email: string; name: string; password: string },
): Promise<AuthSession> => {
  const response = await request(testApp.getServer()).post('/api/v1/users').send(payload).expect(201);
  return response.body as AuthSession;
};

const loginUser = async (testApp: TestApp, email: string, password: string): Promise<AuthSession> => {
  const response = await request(testApp.getServer()).post('/api/v1/auth/sessions').send({ email, password });
  return response.body as AuthSession;
};

describe('Users Module (Integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user and persist to the database', async () => {
      const timestamp = Date.now();
      const payload = {
        email: `integration-${String(timestamp)}@test.com`,
        name: 'Integration User',
        password: 'plainPassword123',
      };

      const response = await request(testApp.getServer()).post('/api/v1/users').send(payload).expect(201);

      const body = response.body as AuthSession;
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toMatchObject({
        email: payload.email,
        name: payload.name,
      });
    });

    it('should reject invalid payload with 400', async () => {
      const invalidPayload = {
        email: 'not-an-email',
        name: '',
        password: '123',
      };

      const response = await request(testApp.getServer()).post('/api/v1/users').send(invalidPayload).expect(400);

      const body = response.body as { error?: { code: string } };
      expect(body.error?.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/v1/users', () => {
    const password = 'plainPassword123';
    let adminToken: string;
    let clientToken: string;
    let adminEmail: string;

    beforeAll(async () => {
      const timestamp = Date.now();
      adminEmail = `list-admin-${String(timestamp)}@test.com`;
      const clientEmail = `list-client-${String(timestamp)}@test.com`;

      await registerUser(testApp, { email: adminEmail, name: 'List Admin', password });
      const clientSession = await registerUser(testApp, { email: clientEmail, name: 'List Client', password });
      clientToken = clientSession.accessToken;

      const prisma = testApp.get(PrismaService);
      await prisma.user.update({ data: { role: 'ADMIN' }, where: { email: adminEmail } });
      const adminSession = await loginUser(testApp, adminEmail, password);
      adminToken = adminSession.accessToken;
    });

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
  });
});
