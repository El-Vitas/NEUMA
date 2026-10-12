import { Injectable } from '@nestjs/common';
import type { NeumaTransaction, OutboxConsumer } from '@neuma/db';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  OUTBOX_CONSUMERS,
  OUTBOX_ERROR_REDACTION_LABEL,
  OUTBOX_LEASE_SECONDS,
  OUTBOX_MAX_CLAIM_BATCH_SIZE,
  OUTBOX_RETRY_BASE_SECONDS,
} from '../../constants/outbox.constants';
import type {
  OutboxDeliveryRecord,
  OutboxEventContract,
  OutboxEventInput,
  OutboxProjectionOutbox,
} from '../../types/outbox.types';

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

  // The event and one delivery per consumer are a single insert, so no consumer can miss an event.
  async create(input: OutboxEventInput, transaction?: NeumaTransaction): Promise<void> {
    await this.prisma.modelsFor(transaction).OutboxEvent.create({
      ...input,
      deliveries: (deliveries) => deliveries.create(OUTBOX_CONSUMERS.map((consumer) => ({ consumer }))),
    });
  }

  forConsumer(consumer: OutboxConsumer): OutboxProjectionOutbox {
    return {
      claimPending: (limit) => this.claimPending(consumer, limit),
      markFailed: (deliveryId, error) => this.markFailureState(deliveryId, 'FAILED', error, new Date()),
      markProcessed: (deliveryId) => this.markProcessed(deliveryId),
      markRetryable: (deliveryId, error, attemptCount) =>
        this.markFailureState(
          deliveryId,
          'PENDING',
          error,
          new Date(Date.now() + retryDelaySeconds(attemptCount) * 1000),
        ),
    };
  }

  private async claimPending(consumer: OutboxConsumer, limit: number): Promise<readonly OutboxDeliveryRecord[]> {
    const boundedLimit = Math.max(1, Math.min(limit, OUTBOX_MAX_CLAIM_BATCH_SIZE));
    const event = this.prisma.tables.OutboxEvent.columns;
    const delivery = this.prisma.tables.OutboxDelivery.columns;
    return this.prisma.runner.query(
      this.prisma.sql`
      WITH claimed AS (
        SELECT "id"
        FROM "OutboxDelivery"
        WHERE "consumer" = ${consumer}::"OutboxConsumer"
          AND "nextAttemptAt" <= now()
          AND ("status" = 'PENDING'::"OutboxStatus" OR "status" = 'PROCESSING'::"OutboxStatus")
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${boundedLimit}
      )
      UPDATE "OutboxDelivery" AS delivery
      SET "status" = 'PROCESSING'::"OutboxStatus",
          "attemptCount" = delivery."attemptCount" + 1,
          "nextAttemptAt" = now() + make_interval(secs => ${OUTBOX_LEASE_SECONDS})
      FROM claimed, "OutboxEvent" AS event
      WHERE delivery."id" = claimed."id" AND event."id" = delivery."eventId"
      RETURNING event."aggregateId", event."aggregateType", delivery."attemptCount", delivery."id" AS "deliveryId",
        event."eventType", event."idempotencyKey", event."payload", event."payloadVersion"
    `
        .returnsRow({
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          attemptCount: delivery.attemptCount,
          deliveryId: delivery.id,
          eventType: event.eventType,
          idempotencyKey: event.idempotencyKey,
          payload: event.payload,
          payloadVersion: event.payloadVersion,
        })
        .build(),
    );
  }

  private async markProcessed(deliveryId: string): Promise<void> {
    const updated = await this.prisma.models.OutboxDelivery.where({ id: deliveryId }).update({
      processedAt: new Date(),
      status: 'PROCESSED',
    });
    if (updated === null) throw new Error(`Outbox delivery ${deliveryId} not found when marking it processed`);
  }

  private async markFailureState(
    deliveryId: string,
    status: 'FAILED' | 'PENDING',
    error: unknown,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.prisma.models.OutboxDelivery.where({ id: deliveryId }).updateAndCount({
      nextAttemptAt,
      lastError: { message: safeErrorMessage(error), recordedAt: new Date().toISOString() },
      status,
    });
  }
}
