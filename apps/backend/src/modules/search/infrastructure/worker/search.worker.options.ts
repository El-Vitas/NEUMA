import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '../../../../common/constants/outbox.constants';
import type {
  OutboxWorkerApplicationResolver,
  OutboxWorkerBootstrapOptions,
  OutboxWorkerLogger,
} from '../../../../common/types/outbox-worker.types';
import { SEARCH_WORKER_IDLE_DELAY_MS } from '../../constants/search.constants';
import { SearchProjectionWorker } from './search.projection.worker';

export const buildSearchWorkerBootstrapOptions = (
  logger: OutboxWorkerLogger,
): OutboxWorkerBootstrapOptions<OutboxWorkerApplicationResolver> => ({
  batchSize: OUTBOX_MAX_CLAIM_BATCH_SIZE,
  createApplicationContext: () => NestFactory.createApplicationContext(AppModule, { logger: false }),
  idleDelayMs: SEARCH_WORKER_IDLE_DELAY_MS,
  logger,
  resolveProjectionWorker: (application) => application.get(SearchProjectionWorker),
  workerLabel: 'Search projection worker',
});
