import 'reflect-metadata';
import {
  createOutboxWorkerLogger,
  runOutboxProjectionWorkerBootstrap,
} from '../../../../common/infrastructure/worker/outbox-worker.bootstrap';
import { buildSearchWorkerBootstrapOptions } from './search.worker.options';

const workerLogger = createOutboxWorkerLogger();

export const runSearchWorker = async (): Promise<void> =>
  runOutboxProjectionWorkerBootstrap(buildSearchWorkerBootstrapOptions(workerLogger));

void runSearchWorker().catch((error: unknown) => {
  workerLogger.error({ err: error }, 'Search projection worker terminated with an error');
  process.exitCode = 1;
});
