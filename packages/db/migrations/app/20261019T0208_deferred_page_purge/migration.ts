#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/97e75778ff833a1e2e4e43af107ddad31df8eea6f1d710471e1b578151e31d5a/contract';
import startContract from '../../snapshots/97e75778ff833a1e2e4e43af107ddad31df8eea6f1d710471e1b578151e31d5a/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/d4bacf6603fdc05da1c8e9abc8626d14f56949a5cadb4fb37956781397345fc3/contract';
import endContract from '../../snapshots/d4bacf6603fdc05da1c8e9abc8626d14f56949a5cadb4fb37956781397345fc3/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PagePurge',
        columns: [
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purgeAfter', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('purgedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('requestedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PagePurge_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Page',
        column: col('purgeAfter', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-date@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_purgeAfter_idx',
        columns: ['purgeAfter'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PagePurge',
        index: 'PagePurge_pageId_idx',
        columns: ['pageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PagePurge',
        index: 'PagePurge_workspaceId_requestedAt_idx',
        columns: ['workspaceId', 'requestedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
