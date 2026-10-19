#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4fee5f375e8686981638cbd83f293b894676ddcd8da879ece508a90dad5cb2b1/contract';
import endContract from '../../snapshots/4fee5f375e8686981638cbd83f293b894676ddcd8da879ece508a90dad5cb2b1/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/d4bacf6603fdc05da1c8e9abc8626d14f56949a5cadb4fb37956781397345fc3/contract';
import startContract from '../../snapshots/d4bacf6603fdc05da1c8e9abc8626d14f56949a5cadb4fb37956781397345fc3/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, fn, lit, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

const isTrue = (description: string, sql: string) => [{ description, sql }];

const indexExists = (name: string): string =>
  `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${name}')`;

const columnExists = (table: string, column: string): string =>
  `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}')`;

const searchSql = (id: string, label: string, sql: string, doneWhen: string) =>
  rawSql({
    id,
    label,
    operationClass: 'additive',
    target: { id: 'postgres' },
    precheck: isTrue('not done yet', `SELECT NOT (${doneWhen})`),
    execute: isTrue(label, sql),
    postcheck: isTrue('done', doneWhen),
  });

const searchOperations = () => [
  searchSql(
    'column.Block.searchVector',
    'Add generated column "searchVector" to "Block"',
    `ALTER TABLE "public"."Block"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, public.immutable_unaccent(coalesce("text", '')))
  ) STORED`,
    columnExists('Block', 'searchVector'),
  ),
  searchSql(
    'index.Block_searchVector_gin_idx',
    'Create index "Block_searchVector_gin_idx"',
    'CREATE INDEX "Block_searchVector_gin_idx" ON "public"."Block" USING GIN ("searchVector")',
    indexExists('Block_searchVector_gin_idx'),
  ),
  searchSql(
    'index.Block_text_unaccent_trgm_idx',
    'Create index "Block_text_unaccent_trgm_idx"',
    'CREATE INDEX "Block_text_unaccent_trgm_idx" ON "public"."Block" USING GIN (public.immutable_unaccent("text") gin_trgm_ops)',
    indexExists('Block_text_unaccent_trgm_idx'),
  ),
];

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Block',
        columns: [
          col('alive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('children', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('editedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('editedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('format', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lifecycle', '"PageLifecycle"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PageLifecycle' } },
          }),
          col('lockedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('lockedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('permissions', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('properties', 'jsonb', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('purgeAfter', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('text', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('textState', 'bytea', { codecRef: { codecId: 'pg/bytea@1' } }),
          col('trashedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('verificationExpiresAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('verifiedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('verifiedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Block_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_ownerId_idx',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_parentId_idx',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_purgeAfter_idx',
        columns: ['purgeAfter'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_spaceId_lifecycle_idx',
        columns: ['spaceId', 'lifecycle'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_verificationExpiresAt_idx',
        columns: ['verificationExpiresAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Block',
        foreignKey: {
          name: 'Block_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'Space', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Block',
        foreignKey: {
          name: 'Block_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Block',
        foreignKey: {
          name: 'Block_verifiedById_fkey',
          columns: ['verifiedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Block',
        foreignKey: {
          name: 'Block_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      ...searchOperations(),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
