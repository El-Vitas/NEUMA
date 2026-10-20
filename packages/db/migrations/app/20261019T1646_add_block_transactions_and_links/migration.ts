#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4fee5f375e8686981638cbd83f293b894676ddcd8da879ece508a90dad5cb2b1/contract';
import startContract from '../../snapshots/4fee5f375e8686981638cbd83f293b894676ddcd8da879ece508a90dad5cb2b1/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/e34575adbfc072430535fef14dc2ab29be661c6fcf2a270a95cf87c6894da39e/contract';
import endContract from '../../snapshots/e34575adbfc072430535fef14dc2ab29be661c6fcf2a270a95cf87c6894da39e/contract.json' with {
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
        table: 'BlockLink',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceBlockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourcePageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetBlockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'BlockLink_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlockTransaction',
        columns: [
          col('appliedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('result', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'BlockTransaction_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BlockLink',
        constraint: 'BlockLink_sourceBlockId_targetBlockId_kind_key',
        columns: ['sourceBlockId', 'targetBlockId', 'kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlockLink',
        index: 'BlockLink_sourcePageId_idx',
        columns: ['sourcePageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlockLink',
        index: 'BlockLink_targetBlockId_idx',
        columns: ['targetBlockId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlockTransaction',
        index: 'BlockTransaction_appliedAt_idx',
        columns: ['appliedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlockTransaction',
        index: 'BlockTransaction_spaceId_idx',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlockTransaction',
        index: 'BlockTransaction_userId_idx',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlockLink',
        foreignKey: {
          name: 'BlockLink_sourceBlockId_fkey',
          columns: ['sourceBlockId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlockLink',
        foreignKey: {
          name: 'BlockLink_targetBlockId_fkey',
          columns: ['targetBlockId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlockLink',
        foreignKey: {
          name: 'BlockLink_sourcePageId_fkey',
          columns: ['sourcePageId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlockTransaction',
        foreignKey: {
          name: 'BlockTransaction_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlockTransaction',
        foreignKey: {
          name: 'BlockTransaction_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'Space', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
