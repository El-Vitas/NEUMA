import { OutboxConsumer } from '@neuma/db';

/** Every event is delivered once to each of these; a new projection only needs its own entry. */
export const OUTBOX_CONSUMERS: readonly OutboxConsumer[] = [OutboxConsumer.SEARCH, OutboxConsumer.LINKS];

export const OUTBOX_MAX_CLAIM_BATCH_SIZE = 100;
export const OUTBOX_LEASE_SECONDS = 300;
export const OUTBOX_RETRY_BASE_SECONDS = 5;
export const OUTBOX_WORKER_LOG_LEVEL = 'info';
export const OUTBOX_ERROR_REDACTION_LABEL = 'removed';
