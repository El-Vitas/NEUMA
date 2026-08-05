import type { Type } from '@nestjs/common';

export interface OutboxWorkerApplicationContext {
  close(): Promise<void>;
}

export interface OutboxWorkerBatchProcessor {
  processBatch(limit: number): Promise<number>;
}

export interface OutboxWorkerApplicationResolver extends OutboxWorkerApplicationContext {
  get(token: Type<OutboxWorkerBatchProcessor>): OutboxWorkerBatchProcessor;
}

export interface OutboxWorkerLogger {
  info(fieldsOrMessage: string | Record<string, unknown>, message?: string): void;
  error(fields: Record<string, unknown>, message: string): void;
}

export interface OutboxWorkerBootstrapOptions<TApplication extends OutboxWorkerApplicationContext> {
  readonly workerLabel: string;
  readonly idleDelayMs: number;
  readonly batchSize: number;
  readonly logger: OutboxWorkerLogger;
  readonly createApplicationContext: () => Promise<TApplication>;
  readonly resolveProjectionWorker: (application: TApplication) => OutboxWorkerBatchProcessor;
}
