import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { OutboxRepository } from '@/common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const EVENT_PAYLOAD = { pageId: 'page-outbox', title: 'Lo que el evento lleva' };

describe('Outbox (Integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  /** Un evento que falla se reintenta con lo mismo que llevaba: el fallo se anota aparte y sin secretos. */
  it('records why an event failed, without its secrets, and keeps what the event carries', async () => {
    const prisma = testApp.get(PrismaService);
    const outbox = testApp.get(OutboxRepository);
    const idempotencyKey = `outbox-failure-${String(Date.now())}`;
    await outbox.create({
      aggregateId: 'page-outbox',
      aggregateType: 'Page',
      eventType: 'PageUpdated',
      idempotencyKey,
      payload: EVENT_PAYLOAD,
      payloadVersion: 1,
    });
    const { id } = await prisma.outboxEvent.findUniqueOrThrow({ select: { id: true }, where: { idempotencyKey } });

    await outbox.markRetryable(id, new Error('index down, token=abc123'), 1);

    const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    expect(stored.status).toBe('PENDING');
    expect(stored.payload).toEqual(EVENT_PAYLOAD);
    expect(JSON.stringify(stored.lastError)).toContain('token=removed');
    expect(JSON.stringify(stored.lastError)).not.toContain('abc123');
    expect(stored.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('lets an event that is already gone fail quietly, without writing anything', () => {
    const outbox = testApp.get(OutboxRepository);

    const marked = outbox.markFailed('01a10000-0000-7000-8000-00000000dead', new Error('nobody'));

    expect(marked).resolves.toBeUndefined();
  });
});
