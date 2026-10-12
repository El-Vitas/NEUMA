#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/01ceaee91c400b3db5a5b619540972ff8a0cb4b116d8bf49c55570c90aeeaaa6/contract';
import startContract from '../../snapshots/01ceaee91c400b3db5a5b619540972ff8a0cb4b116d8bf49c55570c90aeeaaa6/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/efa02afd121c2a097491c0a23026a4fdad577a2102dcf7f1d2239e5421e742ce/contract';
import endContract from '../../snapshots/efa02afd121c2a097491c0a23026a4fdad577a2102dcf7f1d2239e5421e742ce/contract.json' with {
  type: 'json',
};
import { col, fn, lit, Migration, MigrationCLI, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

const hasDeliveryFor = (consumer: string): string =>
  `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."OutboxEvent" AS event
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."OutboxDelivery" AS delivery
    WHERE delivery."eventId" = event."id" AND delivery."consumer" = '${consumer}'::"OutboxConsumer"
  )
)`;

// Before this change the first worker to claim an event marked it processed for everyone, so a processed event
// may never have reached the other projection. Both projections rebuild from the current page and are
// idempotent, so delivering every non-failed event once more repairs what was left stale.
const deliverExistingEventsTo = (consumer: string) =>
  rawSql({
    id: `deliveries.${consumer}`,
    label: `Give every existing event a delivery for ${consumer}`,
    operationClass: 'data',
    target: { id: 'postgres' },
    precheck: [
      {
        description: 'the event state is still on the event',
        sql: "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'OutboxEvent' AND column_name = 'status')",
      },
    ],
    execute: [
      {
        description: 'copy each event state into a delivery',
        sql: `INSERT INTO "public"."OutboxDelivery"
  ("id", "eventId", "consumer", "status", "attemptCount", "nextAttemptAt", "lastError", "processedAt", "createdAt")
SELECT uuidv7()::text, event."id", '${consumer}'::"OutboxConsumer",
  CASE WHEN event."status" = 'FAILED'::"OutboxStatus" THEN 'FAILED'::"OutboxStatus" ELSE 'PENDING'::"OutboxStatus" END,
  CASE WHEN event."status" = 'FAILED'::"OutboxStatus" THEN event."attemptCount" ELSE 0 END,
  now(),
  CASE WHEN event."status" = 'FAILED'::"OutboxStatus" THEN event."lastError" END,
  NULL,
  event."createdAt"
FROM "public"."OutboxEvent" AS event
ON CONFLICT ("eventId", "consumer") DO NOTHING`,
      },
    ],
    postcheck: [{ description: 'every event has a delivery for it', sql: hasDeliveryFor(consumer) }],
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OutboxConsumer',
        members: ['SEARCH', 'LINKS'],
      }),
      this.createTable({
        schema: 'public',
        table: 'OutboxDelivery',
        columns: [
          col('attemptCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('consumer', '"OutboxConsumer"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OutboxConsumer' } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('nextAttemptAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('status', '"OutboxStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OutboxStatus' } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'OutboxDelivery_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'OutboxDelivery',
        constraint: 'OutboxDelivery_eventId_consumer_key',
        columns: ['eventId', 'consumer'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxDelivery',
        index: 'OutboxDelivery_consumer_status_nextAttemptAt_idx',
        columns: ['consumer', 'status', 'nextAttemptAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OutboxDelivery',
        foreignKey: {
          name: 'OutboxDelivery_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'OutboxEvent', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      deliverExistingEventsTo('SEARCH'),
      deliverExistingEventsTo('LINKS'),
      this.dropIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_status_nextAttemptAt_idx',
      }),
      this.dropColumn({ schema: 'public', table: 'OutboxEvent', column: 'attemptCount' }),
      this.dropColumn({ schema: 'public', table: 'OutboxEvent', column: 'lastError' }),
      this.dropColumn({ schema: 'public', table: 'OutboxEvent', column: 'processedAt' }),
      this.dropColumn({ schema: 'public', table: 'OutboxEvent', column: 'nextAttemptAt' }),
      this.dropColumn({ schema: 'public', table: 'OutboxEvent', column: 'status' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
