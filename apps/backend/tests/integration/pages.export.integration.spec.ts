import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import request from 'supertest';
import { EXPORT_RATE_LIMIT } from '@/common/constants/throttler.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

describe('Exporting pages (Integration)', () => {
  let testApp: TestApp;
  let token: string;
  let spaceId: string;

  const exportSpace = () =>
    request(testApp.getServer())
      .get(`/api/v1/spaces/${spaceId}/pages/export/markdown`)
      .query({ scope: 'space' })
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const email = `export-${String(Date.now())}@test.com`;
    const password = 'plainPassword123';
    await registerUser(testApp, { email, name: 'Exporter', password });
    await testApp.get(PrismaService).user.update({ data: { role: 'ADMIN' }, where: { email } });
    token = (await loginUser(testApp, email, password)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Export Space', slug: `export-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  /** Exportar es de lo más caro que hace el servidor: pasado su tope por minuto, se corta. */
  it('stops exporting once a person asked too many times in a row', async () => {
    for (let exported = 0; exported < EXPORT_RATE_LIMIT.perUserLimit; exported += 1) {
      const allowed = await exportSpace();
      expect(allowed.status).not.toBe(429);
    }

    await exportSpace().expect(429);
  });
});
