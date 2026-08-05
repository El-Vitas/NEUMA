import 'reflect-metadata';
import {
  createOutboxWorkerLogger,
  runOutboxProjectionWorkerBootstrap,
} from '../../../../common/infrastructure/worker/outbox-worker.bootstrap';
import { buildLinksWorkerBootstrapOptions } from './links.worker.options';

const workerLogger = createOutboxWorkerLogger();

export const runLinksWorker = async (): Promise<void> =>
  runOutboxProjectionWorkerBootstrap(buildLinksWorkerBootstrapOptions(workerLogger));

void runLinksWorker().catch((error: unknown) => {
  workerLogger.error({ err: error }, 'Links projection worker terminated with an error');
  process.exitCode = 1;
});
