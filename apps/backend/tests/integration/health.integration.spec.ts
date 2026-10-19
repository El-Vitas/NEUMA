import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { DatabaseHealthRepository } from '@/common/infrastructure/persistence/database-health.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

describe('Health endpoints (Integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('answers ready without a session when the database replies', async () => {
    const response = await request(testApp.getServer()).get('/api/v1/health/ready').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports a database nobody listens on as unreachable, within the timeout', async () => {
    const unreachable = new PrismaService(
      new ConfigService({ DATABASE_URL: 'postgresql://nobody:nothing@127.0.0.1:1/missing' }),
    );
    const repository = new DatabaseHealthRepository(unreachable, new PinoLogger({ pinoHttp: { level: 'silent' } }));
    const startedAt = performance.now();

    const reachable = await repository.isReachable(500);

    expect(reachable).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(2000);
    await unreachable.onApplicationShutdown();
  });
});
