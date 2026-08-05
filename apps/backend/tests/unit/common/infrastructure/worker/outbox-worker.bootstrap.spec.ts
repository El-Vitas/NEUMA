import { describe, expect, test } from 'bun:test';
import { runOutboxProjectionWorkerBootstrap } from '@/common/infrastructure/worker/outbox-worker.bootstrap';

const createSilentLogger = () => ({
  error: (): void => {},
  info: (): void => {},
});

const runBootstrapUntilSignal = async (signal: 'SIGINT' | 'SIGTERM') => {
  const batchSizesUsed: number[] = [];
  const closeCallCount: number[] = [];
  let applicationContextCreated = false;
  let resolvedApplication: unknown = null;
  let batchCallCount = 0;

  const application = {
    close: (): Promise<void> => {
      closeCallCount.push(1);
      return Promise.resolve();
    },
  };

  await runOutboxProjectionWorkerBootstrap({
    batchSize: 10,
    createApplicationContext: () => {
      applicationContextCreated = true;
      return Promise.resolve(application);
    },
    idleDelayMs: 5,
    logger: createSilentLogger(),
    resolveProjectionWorker: (createdApplication) => {
      resolvedApplication = createdApplication;
      return {
        processBatch: (limit: number) => {
          batchSizesUsed.push(limit);
          batchCallCount += 1;
          if (batchCallCount === 1) process.emit(signal);
          return Promise.resolve(1);
        },
      };
    },
    workerLabel: 'Test worker',
  });

  return { applicationContextCreated, batchSizesUsed, closeCallCount, resolvedApplication, application };
};

describe('runOutboxProjectionWorkerBootstrap', () => {
  test('creates the application context and processes at least one batch before stopping', async () => {
    const { applicationContextCreated, batchSizesUsed, resolvedApplication, application } =
      await runBootstrapUntilSignal('SIGINT');

    expect(applicationContextCreated).toBe(true);
    expect(resolvedApplication).toBe(application);
    expect(batchSizesUsed.length).toBeGreaterThan(0);
    expect(batchSizesUsed.every((batchSize) => batchSize === 10)).toBe(true);
  }, 2000);

  test('stops processing and closes the application once a SIGINT is received', async () => {
    const { closeCallCount } = await runBootstrapUntilSignal('SIGINT');

    expect(closeCallCount).toEqual([1]);
  }, 2000);

  test('stops processing and closes the application once a SIGTERM is received', async () => {
    const { closeCallCount } = await runBootstrapUntilSignal('SIGTERM');

    expect(closeCallCount).toEqual([1]);
  }, 2000);
});
