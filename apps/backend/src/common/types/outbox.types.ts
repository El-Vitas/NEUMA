import type { Prisma } from '@company-brain/db/generated';

export interface OutboxEventInput {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly idempotencyKey: string;
  readonly payload: Prisma.InputJsonValue;
  readonly payloadVersion: number;
}

export interface OutboxEventContract {
  readonly create: (input: OutboxEventInput, transaction?: Prisma.TransactionClient) => Promise<void>;
  readonly claimPending: (limit: number) => Promise<readonly OutboxEventRecord[]>;
  readonly markProcessed: (id: string) => Promise<void>;
}

export interface OutboxEventRecord {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly attemptCount: number;
  readonly eventType: string;
  readonly id: string;
  readonly idempotencyKey: string;
  readonly payload: Prisma.JsonValue;
  readonly payloadVersion: number;
}
