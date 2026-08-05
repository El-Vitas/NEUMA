import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '../../../../common/constants/outbox.constants';
import type {
  OutboxWorkerApplicationResolver,
  OutboxWorkerBootstrapOptions,
  OutboxWorkerLogger,
} from '../../../../common/types/outbox-worker.types';
import { LINKS_WORKER_IDLE_DELAY_MS } from '../../constants/links.constants';
import { LinksProjectionWorker } from './links.projection.worker';

export const buildLinksWorkerBootstrapOptions = (
  logger: OutboxWorkerLogger,
): OutboxWorkerBootstrapOptions<OutboxWorkerApplicationResolver> => ({
  batchSize: OUTBOX_MAX_CLAIM_BATCH_SIZE,
  createApplicationContext: () => NestFactory.createApplicationContext(AppModule, { logger: false }),
  idleDelayMs: LINKS_WORKER_IDLE_DELAY_MS,
  logger,
  resolveProjectionWorker: (application) => application.get(LinksProjectionWorker),
  workerLabel: 'Links projection worker',
});
