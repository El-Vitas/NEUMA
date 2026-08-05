import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import pino from 'pino';
import { AppModule } from '../../../../app.module';
import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '../../../../common/constants/outbox.constants';
import { LINKS_WORKER_IDLE_DELAY_MS } from '../../constants/links.constants';
import { LinksProjectionWorker } from './links.projection.worker';

const workerLogger = pino(
  {
    level: 'info',
    redact: { paths: ['password', 'secret', 'token', 'email'], remove: true },
  },
  pino.destination(2),
);

const waitForNextBatch = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, LINKS_WORKER_IDLE_DELAY_MS));
};

export const runLinksWorker = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const projectionWorker = application.get(LinksProjectionWorker);
  const workerState = { isStopping: false };
  const requestShutdown = (signal: string): void => {
    workerState.isStopping = true;
    workerLogger.info({ signal }, 'Links projection worker stopping');
  };
  const handleSigint = (): void => {
    requestShutdown('SIGINT');
  };
  const handleSigterm = (): void => {
    requestShutdown('SIGTERM');
  };

  process.once('SIGINT', handleSigint);
  process.once('SIGTERM', handleSigterm);
  workerLogger.info('Links projection worker started');
  try {
    for (;;) {
      if (workerState.isStopping) break;
      const processedCount = await projectionWorker.processBatch(OUTBOX_MAX_CLAIM_BATCH_SIZE);
      if (processedCount === 0) await waitForNextBatch();
    }
  } catch (error) {
    workerLogger.error({ err: error }, 'Links projection worker failed');
    throw error;
  } finally {
    process.removeListener('SIGINT', handleSigint);
    process.removeListener('SIGTERM', handleSigterm);
    await application.close();
    workerLogger.info('Links projection worker stopped');
  }
};

void runLinksWorker().catch((error: unknown) => {
  workerLogger.error({ err: error }, 'Links projection worker terminated with an error');
  process.exitCode = 1;
});
