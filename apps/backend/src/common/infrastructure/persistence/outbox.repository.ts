import { Injectable } from '@nestjs/common';
import { Prisma } from '@neuma/db/generated';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  OUTBOX_ERROR_REDACTION_LABEL,
  OUTBOX_LEASE_SECONDS,
  OUTBOX_MAX_CLAIM_BATCH_SIZE,
  OUTBOX_RETRY_BASE_SECONDS,
} from '../../constants/outbox.constants';
import type { OutboxEventContract, OutboxEventInput, OutboxEventRecord } from '../../types/outbox.types';

const retryDelaySeconds = (attemptCount: number): number =>
  Math.min(OUTBOX_LEASE_SECONDS, OUTBOX_RETRY_BASE_SECONDS * 2 ** Math.max(0, attemptCount - 1));

const safeErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown outbox processing error';
  return message
    .replaceAll(
      /(authorization|password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      (_match, key: string) => `${key}=${OUTBOX_ERROR_REDACTION_LABEL}`,
    )
    .slice(0, 500);
};

@Injectable()
export class OutboxRepository implements OutboxEventContract {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: OutboxEventInput, transaction?: Prisma.TransactionClient): Promise<void> {
    const client = transaction ?? this.prisma;
    await client.outboxEvent.create({ data: input });
  }

  async claimPending(limit: number): Promise<readonly OutboxEventRecord[]> {
    const boundedLimit = Math.max(1, Math.min(limit, OUTBOX_MAX_CLAIM_BATCH_SIZE));
    return this.prisma.$queryRaw<OutboxEventRecord[]>(Prisma.sql`
      WITH claimed AS (
        SELECT "id"
        FROM "OutboxEvent"
        WHERE "nextAttemptAt" <= now()
          AND ("status" = 'PENDING'::"OutboxStatus" OR "status" = 'PROCESSING'::"OutboxStatus")
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${boundedLimit}
      )
      UPDATE "OutboxEvent" AS event
      SET "status" = 'PROCESSING'::"OutboxStatus",
          "attemptCount" = event."attemptCount" + 1,
          "nextAttemptAt" = now() + make_interval(secs => ${OUTBOX_LEASE_SECONDS})
      FROM claimed
      WHERE event."id" = claimed."id"
      RETURNING event."aggregateId", event."aggregateType", event."attemptCount", event."eventType", event."id",
        event."idempotencyKey", event."payload", event."payloadVersion"
    `);
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      data: { processedAt: new Date(), status: 'PROCESSED' },
      where: { id },
    });
  }

  async markRetryable(id: string, error: unknown, attemptCount: number): Promise<void> {
    await this.markFailureState(id, 'PENDING', error, new Date(Date.now() + retryDelaySeconds(attemptCount) * 1000));
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    await this.markFailureState(id, 'FAILED', error, new Date());
  }

  private async markFailureState(
    id: string,
    status: 'FAILED' | 'PENDING',
    error: unknown,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      data: {
        nextAttemptAt,
        lastError: { message: safeErrorMessage(error), recordedAt: new Date().toISOString() },
        status,
      },
      where: { id },
    });
  }
}
