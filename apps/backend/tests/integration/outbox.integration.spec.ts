import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { OutboxConsumer } from '@neuma/db';
import { OutboxRepository } from '@/common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const EVENT_PAYLOAD = { pageId: 'page-outbox', title: 'Lo que el evento lleva' };

const recordEvent = async (outbox: OutboxRepository, aggregateId: string): Promise<string> => {
  const idempotencyKey = `outbox-${aggregateId}-${String(Date.now())}`;
  await outbox.create({
    aggregateId,
    aggregateType: 'Page',
    eventType: 'PageUpdated',
    idempotencyKey,
    payload: EVENT_PAYLOAD,
    payloadVersion: 1,
  });
  return idempotencyKey;
};

// Other suites leave their own events pending, so the one under test may sit beyond the first batch.
const claimAggregate = async (
  outbox: OutboxRepository,
  consumer: OutboxConsumer,
  aggregateId: string,
): Promise<{ readonly deliveryId: string; readonly payload: unknown } | undefined> => {
  const claimed = await outbox.forConsumer(consumer).claimPending(100);
  const found = claimed.find((event) => event.aggregateId === aggregateId);
  if (found !== undefined || claimed.length === 0) return found;
  return claimAggregate(outbox, consumer, aggregateId);
};

describe('Outbox (Integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('delivers every event to every consumer, so one claiming it never hides it from the other', async () => {
    const outbox = testApp.get(OutboxRepository);
    await recordEvent(outbox, 'page-both-consumers');

    const bySearch = await claimAggregate(outbox, OutboxConsumer.SEARCH, 'page-both-consumers');
    if (bySearch === undefined) throw new Error('Expected search to claim the event');
    await outbox.forConsumer(OutboxConsumer.SEARCH).markProcessed(bySearch.deliveryId);
    const byLinks = await claimAggregate(outbox, OutboxConsumer.LINKS, 'page-both-consumers');

    expect(bySearch.payload).toEqual(EVENT_PAYLOAD);
    expect(byLinks?.payload).toEqual(EVENT_PAYLOAD);
  });

  it('keeps a delivery claimed by one worker away from a second claim of the same consumer', async () => {
    const outbox = testApp.get(OutboxRepository);
    await recordEvent(outbox, 'page-claimed-once');

    const first = await claimAggregate(outbox, OutboxConsumer.LINKS, 'page-claimed-once');
    const second = await claimAggregate(outbox, OutboxConsumer.LINKS, 'page-claimed-once');

    expect(first).toBeDefined();
    expect(second).toBeUndefined();
  });

  it('records why a delivery failed, without its secrets, and leaves the other consumer untouched', async () => {
    const prisma = testApp.get(PrismaService);
    const outbox = testApp.get(OutboxRepository);
    const idempotencyKey = await recordEvent(outbox, 'page-outbox-failure');
    const claimed = await claimAggregate(outbox, OutboxConsumer.SEARCH, 'page-outbox-failure');
    if (claimed === undefined) throw new Error('Expected search to claim the event');

    await outbox
      .forConsumer(OutboxConsumer.SEARCH)
      .markRetryable(claimed.deliveryId, new Error('index down, token=abc123'), 1);

    const event = await prisma.models.OutboxEvent.where({ idempotencyKey }).select('id', 'payload').first();
    if (event === null) throw new Error('Expected the outbox event to exist');
    const deliveries = await prisma.models.OutboxDelivery.where({ eventId: event.id }).all();
    const search = deliveries.find((delivery) => delivery.consumer === OutboxConsumer.SEARCH);
    const links = deliveries.find((delivery) => delivery.consumer === OutboxConsumer.LINKS);
    expect(event.payload).toEqual(EVENT_PAYLOAD);
    expect(search?.status).toBe('PENDING');
    expect(JSON.stringify(search?.lastError)).toContain('token=removed');
    expect(JSON.stringify(search?.lastError)).not.toContain('abc123');
    expect(search?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(links?.status).toBe('PENDING');
    expect(links?.lastError).toBeNull();
  });

  it('lets a delivery that is already gone fail quietly, without writing anything', () => {
    const outbox = testApp.get(OutboxRepository);

    const marked = outbox
      .forConsumer(OutboxConsumer.LINKS)
      .markFailed('01a10000-0000-7000-8000-00000000dead', new Error('nobody'));

    expect(marked).resolves.toBeUndefined();
  });
});
