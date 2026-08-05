import { describe, expect, test } from 'bun:test';
import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '@/common/constants/outbox.constants';
import { SEARCH_WORKER_IDLE_DELAY_MS } from '@/modules/search/constants/search.constants';
import { SearchProjectionWorker } from '@/modules/search/infrastructure/worker/search.projection.worker';
import { buildSearchWorkerBootstrapOptions } from '@/modules/search/infrastructure/worker/search.worker.options';

const createSilentLogger = () => ({
  error: (): void => {},
  info: (): void => {},
});

describe('search worker entrypoint', () => {
  test('configures the shared bootstrap with the search projection worker settings', () => {
    const options = buildSearchWorkerBootstrapOptions(createSilentLogger());

    expect(options.workerLabel).toBe('Search projection worker');
    expect(options.idleDelayMs).toBe(SEARCH_WORKER_IDLE_DELAY_MS);
    expect(options.batchSize).toBe(OUTBOX_MAX_CLAIM_BATCH_SIZE);
  });

  test('resolves the search projection worker from the application context', () => {
    const options = buildSearchWorkerBootstrapOptions(createSilentLogger());
    const projectionWorkerInstance = { processBatch: (): Promise<number> => Promise.resolve(0) };
    const applicationStub = {
      close: (): Promise<void> => Promise.resolve(),
      get: (token: unknown) => {
        if (token !== SearchProjectionWorker) throw new Error('unexpected token requested from the application');
        return projectionWorkerInstance;
      },
    };

    expect(options.resolveProjectionWorker(applicationStub)).toBe(projectionWorkerInstance);
  });
});
