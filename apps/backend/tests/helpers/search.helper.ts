import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '@/common/constants/outbox.constants';
import { SearchProjectionWorker } from '@/modules/search/infrastructure/worker/search.projection.worker';
import type { TestApp } from './test-app.helper';

const MAX_PROJECTION_DRAIN_BATCHES = 20;

/** Proyecta en la búsqueda todo lo pendiente, como lo haría el worker, para que lo recién escrito se pueda encontrar. */
export const drainSearchProjection = async (testApp: TestApp): Promise<void> => {
  const projectionWorker = testApp.get(SearchProjectionWorker);
  for (let batchCount = 0; batchCount < MAX_PROJECTION_DRAIN_BATCHES; batchCount += 1) {
    const processedCount = await projectionWorker.processBatch(OUTBOX_MAX_CLAIM_BATCH_SIZE);
    if (processedCount === 0) return;
  }
  throw new Error(`Outbox did not drain within ${String(MAX_PROJECTION_DRAIN_BATCHES)} batches`);
};
