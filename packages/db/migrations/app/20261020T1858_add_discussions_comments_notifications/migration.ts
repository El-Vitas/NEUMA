#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/320028ff7455f2461c84b5e4c8cc6eb8157387f33a6acdba31a69fa798fafa99/contract';
import endContract from '../../snapshots/320028ff7455f2461c84b5e4c8cc6eb8157387f33a6acdba31a69fa798fafa99/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/5083241f092100d52c71e07d592503da95edb69bdb44fe6c018f68d52de1e10d/contract';
import startContract from '../../snapshots/5083241f092100d52c71e07d592503da95edb69bdb44fe6c018f68d52de1e10d/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, fn, lit, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

// Removes every "comments" key, at any depth of a block's format (the block itself, a list wrapper, a first line and
// the layers of nested blocks all carried them).
const createStripCommentsFunction = `
CREATE FUNCTION "public"."neuma_strip_comments"(value jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE
  entry record;
  result jsonb;
BEGIN
  IF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR entry IN SELECT key, item FROM jsonb_each(value) AS each(key, item) LOOP
      IF entry.key <> 'comments' THEN
        result := result || jsonb_build_object(entry.key, "public"."neuma_strip_comments"(entry.item));
      END IF;
    END LOOP;
    RETURN result;
  END IF;
  IF jsonb_typeof(value) = 'array' THEN
    SELECT COALESCE(jsonb_agg("public"."neuma_strip_comments"(item) ORDER BY position), '[]'::jsonb)
    INTO result
    FROM jsonb_array_elements(value) WITH ORDINALITY AS each(item, position);
    RETURN result;
  END IF;
  RETURN value;
END
$function$`;

// Every comment kept in the format of a block becomes a discussion of one message (ADR 023). The discussion and the
// comment reuse the old comment id, so the inline "comment" marks already in the text keep pointing at it. The author
// is the workspace member with exactly that name; with none or several, the block creator stands in and the original
// name stays at the start of the message. Every such case is reported, and a count that differs aborts the migration.
const moveCommentsToDiscussions = `
DO $migration$
DECLARE
  legacy_total integer;
  inserted_total integer;
  unresolved record;
  unresolved_total integer := 0;
BEGIN
  CREATE TEMP TABLE "legacy_comment" ON COMMIT DROP AS
  SELECT
    block."id" AS "blockId",
    block."spaceId",
    block."createdAt" AS "blockCreatedAt",
    block."createdById" AS "blockCreatorId",
    (position(entry.item ->> 'id' IN block."properties"::text) > 0) AS "isAnchored",
    entry.item ->> 'id' AS "commentId",
    COALESCE(entry.item ->> 'author', '') AS "authorName",
    COALESCE(entry.item ->> 'body', '') AS "text",
    CASE
      WHEN entry.item ->> 'createdAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN (entry.item ->> 'createdAt')::timestamptz
      ELSE date_trunc('milliseconds', block."createdAt")
    END AS "createdAt"
  FROM "public"."Block" AS block
  CROSS JOIN LATERAL jsonb_path_query(block."format", 'strict $.**.comments') AS found(list)
  CROSS JOIN LATERAL jsonb_array_elements(found.list) AS entry(item)
  WHERE block."format" IS NOT NULL AND jsonb_typeof(found.list) = 'array';

  SELECT count(*) INTO legacy_total FROM "legacy_comment";

  CREATE TEMP TABLE "legacy_author" ON COMMIT DROP AS
  SELECT
    legacy."commentId",
    (
      SELECT CASE WHEN count(*) = 1 THEN min(person."id") END
      FROM "public"."Space" AS space
      JOIN "public"."WorkspaceMember" AS member ON member."workspaceId" = space."workspaceId"
      JOIN "public"."User" AS person ON person."id" = member."userId"
      WHERE space."id" = legacy."spaceId" AND person."name" = legacy."authorName"
    ) AS "userId"
  FROM "legacy_comment" AS legacy;

  INSERT INTO "public"."Discussion" ("id", "blockId", "spaceId", "anchorMarkId", "createdById", "createdAt")
  SELECT
    legacy."commentId",
    legacy."blockId",
    legacy."spaceId",
    CASE WHEN legacy."isAnchored" THEN legacy."commentId" END,
    COALESCE(author."userId", legacy."blockCreatorId"),
    legacy."createdAt"
  FROM "legacy_comment" AS legacy
  JOIN "legacy_author" AS author ON author."commentId" = legacy."commentId";

  INSERT INTO "public"."Comment" ("id", "discussionId", "body", "authorId", "createdAt")
  SELECT
    legacy."commentId",
    legacy."commentId",
    CASE
      WHEN author."userId" IS NULL THEN jsonb_build_array(jsonb_build_object('insert', legacy."authorName" || ': ' || legacy."text"))
      WHEN legacy."text" = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('insert', legacy."text"))
    END,
    COALESCE(author."userId", legacy."blockCreatorId"),
    legacy."createdAt"
  FROM "legacy_comment" AS legacy
  JOIN "legacy_author" AS author ON author."commentId" = legacy."commentId";

  FOR unresolved IN
    SELECT legacy."commentId", legacy."blockId", legacy."authorName"
    FROM "legacy_comment" AS legacy
    JOIN "legacy_author" AS author ON author."commentId" = legacy."commentId"
    WHERE author."userId" IS NULL
  LOOP
    unresolved_total := unresolved_total + 1;
    RAISE WARNING 'comment % of block %: author "%" matches none or several workspace members, the block creator stands in',
      unresolved."commentId", unresolved."blockId", unresolved."authorName";
  END LOOP;

  SELECT count(*) INTO inserted_total
  FROM "public"."Discussion" AS discussion
  WHERE discussion."id" IN (SELECT "commentId" FROM "legacy_comment");

  IF inserted_total <> legacy_total THEN
    RAISE EXCEPTION 'comments migration: % comments found, % discussions created', legacy_total, inserted_total;
  END IF;

  RAISE WARNING 'comments migration: % comments moved to discussions, % with the block creator as author', legacy_total, unresolved_total;

  UPDATE "public"."Block"
  SET "format" = "public"."neuma_strip_comments"("format")
  WHERE "format" IS NOT NULL AND jsonb_path_exists("format", 'strict $.**.comments');
END
$migration$`;

const noBlockKeepsComments = `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."Block" WHERE "format" IS NOT NULL AND jsonb_path_exists("format", 'strict $.**.comments')
)`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'NotificationKind',
        members: ['MENTION', 'REPLY', 'PAGE_CHANGE'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Comment',
        columns: [
          col('authorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'jsonb', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('discussionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('editedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Comment_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Discussion',
        columns: [
          col('anchorMarkId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('blockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('resolvedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Discussion_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Notification',
        columns: [
          col('actorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('blockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('commentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('discussionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', '"NotificationKind"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'NotificationKind' } },
          }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('recipientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Notification_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Comment',
        index: 'Comment_discussionId_createdAt_idx',
        columns: ['discussionId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Discussion',
        index: 'Discussion_blockId_createdAt_idx',
        columns: ['blockId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Discussion',
        index: 'Discussion_spaceId_idx',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_blockId_idx',
        columns: ['blockId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_commentId_idx',
        columns: ['commentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_discussionId_idx',
        columns: ['discussionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_readAt_idx',
        columns: ['readAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_recipientId_readAt_createdAt_idx',
        columns: ['recipientId', 'readAt', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Comment',
        foreignKey: {
          name: 'Comment_discussionId_fkey',
          columns: ['discussionId'],
          references: { schema: 'public', table: 'Discussion', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Discussion',
        foreignKey: {
          name: 'Discussion_blockId_fkey',
          columns: ['blockId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_recipientId_fkey',
          columns: ['recipientId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_blockId_fkey',
          columns: ['blockId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_discussionId_fkey',
          columns: ['discussionId'],
          references: { schema: 'public', table: 'Discussion', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_commentId_fkey',
          columns: ['commentId'],
          references: { schema: 'public', table: 'Comment', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      rawSql({
        id: 'function.neuma_strip_comments',
        label: 'Create the helper that removes comments from a block format',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_strip_comments"', sql: createStripCommentsFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'backfill.Discussion.fromBlockComments',
        label: 'Turn the comments kept in each block into discussions of one message',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create a discussion and a comment per old comment', sql: moveCommentsToDiscussions }],
        postcheck: [{ description: 'no block format keeps comments', sql: noBlockKeepsComments }],
      }),
      rawSql({
        id: 'function.drop.neuma_strip_comments',
        label: 'Drop the helper that removed comments from a block format',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          { description: 'drop "neuma_strip_comments"', sql: 'DROP FUNCTION "public"."neuma_strip_comments"(jsonb)' },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
