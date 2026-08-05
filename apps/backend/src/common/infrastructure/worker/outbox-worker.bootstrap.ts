import pino from 'pino';
import { OUTBOX_WORKER_LOG_REDACT_PATHS } from '../../constants/outbox.constants';
import type {
  OutboxWorkerApplicationContext,
  OutboxWorkerBootstrapOptions,
  OutboxWorkerLogger,
} from '../../types/outbox-worker.types';

export const createOutboxWorkerLogger = (): OutboxWorkerLogger =>
  pino(
    {
      level: 'info',
      redact: { paths: [...OUTBOX_WORKER_LOG_REDACT_PATHS], remove: true },
    },
    pino.destination(2),
  );

const waitForIdleDelay = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
};

export const runOutboxProjectionWorkerBootstrap = async <TApplication extends OutboxWorkerApplicationContext>(
  options: OutboxWorkerBootstrapOptions<TApplication>,
): Promise<void> => {
  const { workerLabel, idleDelayMs, batchSize, logger, createApplicationContext, resolveProjectionWorker } = options;
  const application = await createApplicationContext();
  const projectionWorker = resolveProjectionWorker(application);
  const workerState = { isStopping: false };
  const requestShutdown = (signal: string): void => {
    workerState.isStopping = true;
    logger.info({ signal }, `${workerLabel} stopping`);
  };
  const handleSigint = (): void => {
    requestShutdown('SIGINT');
  };
  const handleSigterm = (): void => {
    requestShutdown('SIGTERM');
  };

  process.once('SIGINT', handleSigint);
  process.once('SIGTERM', handleSigterm);
  logger.info(`${workerLabel} started`);
  try {
    for (;;) {
      if (workerState.isStopping) break;
      const processedCount = await projectionWorker.processBatch(batchSize);
      if (processedCount === 0) await waitForIdleDelay(idleDelayMs);
    }
  } catch (error) {
    logger.error({ err: error }, `${workerLabel} failed`);
    throw error;
  } finally {
    process.removeListener('SIGINT', handleSigint);
    process.removeListener('SIGTERM', handleSigterm);
    await application.close();
    logger.info(`${workerLabel} stopped`);
  }
};
