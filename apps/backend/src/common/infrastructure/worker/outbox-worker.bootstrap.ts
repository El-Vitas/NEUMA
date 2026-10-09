import pino from 'pino';
import { OUTBOX_WORKER_LOG_LEVEL } from '../../constants/outbox.constants';
import type {
  OutboxWorkerApplicationContext,
  OutboxWorkerBootstrapOptions,
  OutboxWorkerLogger,
} from '../../types/outbox-worker.types';
import { buildLogOptions } from '../logger.options';

/** El log de los proyectores, con el mismo formato y lo mismo oculto que el del servidor. */
export const createOutboxWorkerLogger = (): OutboxWorkerLogger =>
  pino(buildLogOptions(OUTBOX_WORKER_LOG_LEVEL), pino.destination(2));

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

  // Los tipos de Bun añaden su propio `off`/`removeListener` a `process`, y esa
  // sobrecarga tapa la que Node declara para las señales. El emisor de eventos,
  // que es lo que `process` es, sigue aceptándolas.
  const processEvents: NodeJS.EventEmitter = process;

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
    processEvents.off('SIGINT', handleSigint);
    processEvents.off('SIGTERM', handleSigterm);
    await application.close();
    logger.info(`${workerLabel} stopped`);
  }
};
