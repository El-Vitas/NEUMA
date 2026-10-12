#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/13ae78a9b20094c08bdaa78fc7c9cee0cc1a45a72dc0a01ba604b08ba3652c0c/contract';
import endContract from '../../snapshots/13ae78a9b20094c08bdaa78fc7c9cee0cc1a45a72dc0a01ba604b08ba3652c0c/contract.json' with {
  type: 'json',
};
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  createExtension,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

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

const searchLanguageConfiguration = `CASE "language"
  WHEN 'en' THEN 'english'::regconfig
  WHEN 'es' THEN 'spanish'::regconfig
  ELSE 'simple'::regconfig
END`;

// Prisma cannot model these, so the contract leaves them out and this baseline creates them for a fresh database.
const searchFunctionOperations = () => [
  createExtension('unaccent'),
  createExtension('pg_trgm'),
  searchSql(
    'function.immutable_unaccent',
    'Create function "immutable_unaccent"',
    `CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$`,
    "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'immutable_unaccent')",
  ),
];

const searchIndexOperations = () => [
  searchSql(
    'column.SearchDocument.searchVector',
    'Add generated column "searchVector" to "SearchDocument"',
    `ALTER TABLE "public"."SearchDocument"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector(${searchLanguageConfiguration}, public.immutable_unaccent(coalesce("title", ''))), 'A')
    || setweight(to_tsvector(${searchLanguageConfiguration}, public.immutable_unaccent(coalesce("extractedText", ''))), 'B')
  ) STORED`,
    columnExists('SearchDocument', 'searchVector'),
  ),
  searchSql(
    'column.PageBlock.searchVector',
    'Add generated column "searchVector" to "PageBlock"',
    `ALTER TABLE "public"."PageBlock"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, public.immutable_unaccent(coalesce("text", '')))
  ) STORED`,
    columnExists('PageBlock', 'searchVector'),
  ),
  searchSql(
    'index.SearchDocument_searchVector_gin_idx',
    'Create index "SearchDocument_searchVector_gin_idx"',
    'CREATE INDEX "SearchDocument_searchVector_gin_idx" ON "public"."SearchDocument" USING GIN ("searchVector")',
    indexExists('SearchDocument_searchVector_gin_idx'),
  ),
  searchSql(
    'index.PageBlock_searchVector_gin_idx',
    'Create index "PageBlock_searchVector_gin_idx"',
    'CREATE INDEX "PageBlock_searchVector_gin_idx" ON "public"."PageBlock" USING GIN ("searchVector")',
    indexExists('PageBlock_searchVector_gin_idx'),
  ),
  searchSql(
    'index.PageBlock_text_unaccent_trgm_idx',
    'Create index "PageBlock_text_unaccent_trgm_idx"',
    'CREATE INDEX "PageBlock_text_unaccent_trgm_idx" ON "public"."PageBlock" USING GIN (public.immutable_unaccent("text") gin_trgm_ops)',
    indexExists('PageBlock_text_unaccent_trgm_idx'),
  ),
  searchSql(
    'index.SearchDocument_title_unaccent_trgm_idx',
    'Create index "SearchDocument_title_unaccent_trgm_idx"',
    'CREATE INDEX "SearchDocument_title_unaccent_trgm_idx" ON "public"."SearchDocument" USING GIN (public.immutable_unaccent("title") gin_trgm_ops)',
    indexExists('SearchDocument_title_unaccent_trgm_idx'),
  ),
  searchSql(
    'index.SearchDocument_extractedText_unaccent_trgm_idx',
    'Create index "SearchDocument_extractedText_unaccent_trgm_idx"',
    'CREATE INDEX "SearchDocument_extractedText_unaccent_trgm_idx" ON "public"."SearchDocument" USING GIN (public.immutable_unaccent("extractedText") gin_trgm_ops)',
    indexExists('SearchDocument_extractedText_unaccent_trgm_idx'),
  ),
];

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      ...searchFunctionOperations(),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'AgentActionOutcome',
        members: ['PENDING', 'DONE', 'REFUSED', 'FAILED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'DatabasePropertyType',
        members: ['TITLE', 'RICH_TEXT', 'SELECT', 'MULTI_SELECT', 'PERSON', 'DATE', 'CHECKBOX', 'NUMBER'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'DatabaseViewType',
        members: ['TABLE', 'BOARD', 'LIST', 'GALLERY', 'CALENDAR', 'CHART'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'FileAssetLifecycle',
        members: ['ACTIVE', 'DELETED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OutboxStatus',
        members: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PageLifecycle',
        members: ['ACTIVE', 'TRASHED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'SearchIndexingState',
        members: ['PENDING', 'INDEXED', 'FAILED', 'PROCESSING'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'SearchSourceType',
        members: ['PAGE'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'SpaceVisibility',
        members: ['PUBLIC_INTERNAL', 'RESTRICTED', 'PRIVATE'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserRole',
        members: ['ADMIN', 'WORKER', 'CLIENT'],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccessToken',
        columns: [
          col('allSpacesPermissions', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('displayPrefix', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastUsedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('secretHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AccessToken_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccessTokenGrant',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permissions', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AccessTokenGrant_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permissions', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('tokenId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AccessTokenPageGrant_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AgentAction',
        columns: [
          col('blockIds', 'text[]', {
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('detail', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('finishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outcome', '"AgentActionOutcome"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'AgentActionOutcome' } },
          }),
          col('pageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tokenId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tool', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AgentAction_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'CollaborationSnapshot',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('documentName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('state', 'bytea', { notNull: true, codecRef: { codecId: 'pg/bytea@1' } }),
          col('updateCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'CollaborationSnapshot_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'FileAsset',
        columns: [
          col('checksum', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deletedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lifecycle', '"FileAssetLifecycle"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'FileAssetLifecycle' } },
          }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originalFilename', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('storageKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'FileAsset_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'OutboxEvent',
        columns: [
          col('aggregateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('aggregateType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('attemptCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('nextAttemptAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('payload', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('payloadVersion', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('processedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', '"OutboxStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OutboxStatus' } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'OutboxEvent_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Page',
        columns: [
          col('content', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('cover', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('icon', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lifecycle', '"PageLifecycle"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PageLifecycle' } },
          }),
          col('lockedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('lockedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('propertyValues', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trashedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('verificationExpiresAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('verifiedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('verifiedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Page_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageBlock',
        columns: [
          col('blockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('headingPath', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageVersion', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('parentBlockId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('text', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['pageId', 'blockId'], { name: 'PageBlock_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageFavorite',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageFavorite_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageLink',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourcePageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetPageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageLink_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageSchemaProperty',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('options', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('required', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('type', '"DatabasePropertyType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'DatabasePropertyType' } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageSchemaProperty_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageSchemaView',
        columns: [
          col('configuration', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', '"DatabaseViewType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'DatabaseViewType' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageSchemaView_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageVersion',
        columns: [
          col('content', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageVersion_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PageView',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('viewedAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'PageView_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'SearchDocument',
        columns: [
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('extractedText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('indexingState', '"SearchIndexingState"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'SearchIndexingState' } },
          }),
          col('language', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('properties', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('sourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceType', '"SearchSourceType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'SearchSourceType' } },
          }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tags', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('versionMarker', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'SearchDocument_pkey' }),
          checkExpression(
            'SearchDocument_language_check',
            "((language IS NULL) OR (language = ANY (ARRAY['en'::text, 'es'::text])))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Space',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('icon', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('visibility', '"SpaceVisibility"', {
            notNull: true,
            default: lit('PUBLIC_INTERNAL'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'SpaceVisibility' } },
          }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Space_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'SpaceMember',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'SpaceMember_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"UserRole"', {
            notNull: true,
            default: lit('CLIENT'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserRole' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'User_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Workspace',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pageViewsEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('singletonKey', 'text', {
            notNull: true,
            default: lit('default'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Workspace_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'WorkspaceMember',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"UserRole"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserRole' } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'WorkspaceMember_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessToken',
        index: 'AccessToken_secretHash_key',
        columns: ['secretHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessToken',
        index: 'AccessToken_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessToken',
        index: 'AccessToken_workspaceId_idx',
        columns: ['workspaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessTokenGrant',
        index: 'AccessTokenGrant_spaceId_idx',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessTokenGrant',
        index: 'AccessTokenGrant_tokenId_spaceId_key',
        columns: ['tokenId', 'spaceId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        index: 'AccessTokenPageGrant_pageId_idx',
        columns: ['pageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        index: 'AccessTokenPageGrant_tokenId_pageId_key',
        columns: ['tokenId', 'pageId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentAction',
        index: 'AgentAction_pageId_idx',
        columns: ['pageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentAction',
        index: 'AgentAction_tokenId_createdAt_idx',
        columns: ['tokenId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentAction',
        index: 'AgentAction_tokenId_requestId_live_key',
        columns: ['tokenId', 'requestId'],
        extras: {
          where: `(("requestId" IS NOT NULL) AND (outcome = ANY (ARRAY['PENDING'::"AgentActionOutcome", 'DONE'::"AgentActionOutcome"])))`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentAction',
        index: 'AgentAction_workspaceId_createdAt_idx',
        columns: ['workspaceId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CollaborationSnapshot',
        index: 'CollaborationSnapshot_documentName_key',
        columns: ['documentName'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'CollaborationSnapshot',
        index: 'CollaborationSnapshot_updatedAt_idx',
        columns: ['updatedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_ownerId_lifecycle_idx',
        columns: ['ownerId', 'lifecycle'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_pageId_lifecycle_idx',
        columns: ['pageId', 'lifecycle'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_storageKey_key',
        columns: ['storageKey'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_workspaceId_lifecycle_idx',
        columns: ['workspaceId', 'lifecycle'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_aggregateType_aggregateId_idx',
        columns: ['aggregateType', 'aggregateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_idempotencyKey_key',
        columns: ['idempotencyKey'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_status_nextAttemptAt_idx',
        columns: ['status', 'nextAttemptAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_ownerId_idx',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_parentId_order_idx',
        columns: ['parentId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_spaceId_lifecycle_order_idx',
        columns: ['spaceId', 'lifecycle', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_verificationExpiresAt_idx',
        columns: ['verificationExpiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageBlock',
        index: 'PageBlock_blockId_idx',
        columns: ['blockId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageBlock',
        index: 'PageBlock_spaceId_idx',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageFavorite',
        index: 'PageFavorite_userId_order_idx',
        columns: ['userId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageFavorite',
        index: 'PageFavorite_userId_pageId_key',
        columns: ['userId', 'pageId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageLink',
        index: 'PageLink_sourcePageId_idx',
        columns: ['sourcePageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageLink',
        index: 'PageLink_sourcePageId_targetPageId_key',
        columns: ['sourcePageId', 'targetPageId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageLink',
        index: 'PageLink_targetPageId_idx',
        columns: ['targetPageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageSchemaProperty',
        index: 'PageSchemaProperty_pageId_key_key',
        columns: ['pageId', 'key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageSchemaProperty',
        index: 'PageSchemaProperty_pageId_order_idx',
        columns: ['pageId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageSchemaView',
        index: 'PageSchemaView_pageId_name_key',
        columns: ['pageId', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageSchemaView',
        index: 'PageSchemaView_pageId_order_idx',
        columns: ['pageId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageSchemaView',
        index: 'PageSchemaView_pageId_type_idx',
        columns: ['pageId', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageVersion',
        index: 'PageVersion_pageId_createdAt_idx',
        columns: ['pageId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageVersion',
        index: 'PageVersion_pageId_version_key',
        columns: ['pageId', 'version'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageView',
        index: 'PageView_pageId_viewedAt_idx',
        columns: ['pageId', 'viewedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PageView',
        index: 'PageView_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SearchDocument',
        index: 'SearchDocument_contentType_idx',
        columns: ['contentType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SearchDocument',
        index: 'SearchDocument_sourceType_sourceId_key',
        columns: ['sourceType', 'sourceId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'SearchDocument',
        index: 'SearchDocument_spaceId_indexingState_idx',
        columns: ['spaceId', 'indexingState'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Space',
        index: 'Space_ownerId_idx',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Space',
        index: 'Space_workspaceId_order_idx',
        columns: ['workspaceId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Space',
        index: 'Space_workspaceId_slug_key',
        columns: ['workspaceId', 'slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Space',
        index: 'Space_workspaceId_visibility_idx',
        columns: ['workspaceId', 'visibility'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SpaceMember',
        index: 'SpaceMember_spaceId_userId_key',
        columns: ['spaceId', 'userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'SpaceMember',
        index: 'SpaceMember_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_idx',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_role_idx',
        columns: ['role'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Workspace',
        index: 'Workspace_singletonKey_key',
        columns: ['singletonKey'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkspaceMember',
        index: 'WorkspaceMember_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkspaceMember',
        index: 'WorkspaceMember_workspaceId_userId_key',
        columns: ['workspaceId', 'userId'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessToken',
        foreignKey: {
          name: 'AccessToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessToken',
        foreignKey: {
          name: 'AccessToken_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'Workspace', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessTokenGrant',
        foreignKey: {
          name: 'AccessTokenGrant_tokenId_fkey',
          columns: ['tokenId'],
          references: { schema: 'public', table: 'AccessToken', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessTokenGrant',
        foreignKey: {
          name: 'AccessTokenGrant_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'Space', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        foreignKey: {
          name: 'AccessTokenPageGrant_tokenId_fkey',
          columns: ['tokenId'],
          references: { schema: 'public', table: 'AccessToken', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        foreignKey: {
          name: 'AccessTokenPageGrant_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Page',
        foreignKey: {
          name: 'Page_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'Space', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Page',
        foreignKey: {
          name: 'Page_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Page',
        foreignKey: {
          name: 'Page_verifiedById_fkey',
          columns: ['verifiedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Page',
        foreignKey: {
          name: 'Page_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageBlock',
        foreignKey: {
          name: 'PageBlock_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageFavorite',
        foreignKey: {
          name: 'PageFavorite_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageFavorite',
        foreignKey: {
          name: 'PageFavorite_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageLink',
        foreignKey: {
          name: 'PageLink_sourcePageId_fkey',
          columns: ['sourcePageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageLink',
        foreignKey: {
          name: 'PageLink_targetPageId_fkey',
          columns: ['targetPageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageSchemaProperty',
        foreignKey: {
          name: 'PageSchemaProperty_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageSchemaView',
        foreignKey: {
          name: 'PageSchemaView_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageVersion',
        foreignKey: {
          name: 'PageVersion_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageView',
        foreignKey: {
          name: 'PageView_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Page', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PageView',
        foreignKey: {
          name: 'PageView_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Space',
        foreignKey: {
          name: 'Space_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'Workspace', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Space',
        foreignKey: {
          name: 'Space_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SpaceMember',
        foreignKey: {
          name: 'SpaceMember_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'Space', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SpaceMember',
        foreignKey: {
          name: 'SpaceMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkspaceMember',
        foreignKey: {
          name: 'WorkspaceMember_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'Workspace', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkspaceMember',
        foreignKey: {
          name: 'WorkspaceMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      ...searchIndexOperations(),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
