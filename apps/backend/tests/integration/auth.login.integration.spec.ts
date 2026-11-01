import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ACCESS_TOKEN_AUDIENCE } from '@/common/constants/auth.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

describe('Login answers (Integration)', () => {
  let testApp: TestApp;
  const password = 'plainPassword123';

  const login = (email: string, attempt: string) =>
    request(testApp.getServer()).post('/api/v1/auth/sessions').send({ email, password: attempt });

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('answers the same for an unknown email, a wrong password and a deactivated account', async () => {
    const email = `login-inactive-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Inactive User', password });
    await testApp.get(PrismaService).models.User.where({ email }).update({ isActive: false });

    const unknown = await login(`nobody-${String(Date.now())}@test.com`, password);
    const wrong = await login(email, 'notThePassword1');
    const deactivated = await login(email, password);

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(deactivated.status).toBe(401);
    expect(deactivated.body).toEqual(unknown.body);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('refuses an access token that carries no session family', async () => {
    const email = `login-no-family-${String(Date.now())}@test.com`;
    const session = await createAccount(testApp, { email, name: 'No Family', password });
    const withoutFamily = await testApp
      .get(JwtService)
      .signAsync(
        { aud: ACCESS_TOKEN_AUDIENCE, email, name: 'No Family', role: session.user.role, sub: session.user.id },
        { expiresIn: '5m', secret: testApp.get(ConfigService).getOrThrow<string>('JWT_SECRET') },
      );

    const response = await request(testApp.getServer())
      .delete('/api/v1/auth/sessions/current')
      .set('Authorization', `Bearer ${withoutFamily}`);

    expect(response.status).toBe(401);
  });
});
