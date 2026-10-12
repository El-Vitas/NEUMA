import type { JsonValue, NeumaTransaction, OutboxConsumer } from '@neuma/db';

export interface OutboxEventInput {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly idempotencyKey: string;
  readonly payload: JsonValue;
  readonly payloadVersion: number;
}

export interface OutboxEventContract {
  readonly create: (input: OutboxEventInput, transaction?: NeumaTransaction) => Promise<void>;
  readonly forConsumer: (consumer: OutboxConsumer) => OutboxProjectionOutbox;
}

/** One consumer's claimed delivery, carrying the event it delivers. */
export interface OutboxDeliveryRecord {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly attemptCount: number;
  readonly deliveryId: string;
  readonly eventType: string;
  readonly idempotencyKey: string;
  readonly payload: JsonValue;
  readonly payloadVersion: number;
}

export interface OutboxProjectionOutbox {
  readonly claimPending: (limit: number) => Promise<readonly OutboxDeliveryRecord[]>;
  readonly markFailed: (deliveryId: string, error: unknown) => Promise<void>;
  readonly markProcessed: (deliveryId: string) => Promise<void>;
  readonly markRetryable: (deliveryId: string, error: unknown, attemptCount: number) => Promise<void>;
}

export type OutboxProjectionEvent = OutboxDeliveryRecord;
