#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/03e484a78007ec7a86ab2d63c8b40063d74c20fedd9957450b83573fcd902f1d/contract';
import startContract from '../../snapshots/03e484a78007ec7a86ab2d63c8b40063d74c20fedd9957450b83573fcd902f1d/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/4222393bf79cbf8789788a0fda10abf1bbc8361c611e1066822f08a34af49215/contract';
import endContract from '../../snapshots/4222393bf79cbf8789788a0fda10abf1bbc8361c611e1066822f08a34af49215/contract.json' with {
  type: 'json',
};
import { col, lit, Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

// Every top-level page block of a space, in the order the old model kept: "Page"."order", then creation time. A page
// block that never had a "Page" row (created after the move to blocks) goes after the others, by creation time.
const backfillRootPageIds = `
UPDATE "public"."Space" AS space
SET "rootPageIds" = roots."ids"
FROM (
  SELECT block."spaceId", array_agg(block."id" ORDER BY page."order" NULLS LAST, block."createdAt", block."id") AS "ids"
  FROM "public"."Block" AS block
  LEFT JOIN "public"."Page" AS page ON page."id" = block."id"
  WHERE block."type" = 'page' AND block."parentId" IS NULL
  GROUP BY block."spaceId"
) AS roots
WHERE roots."spaceId" = space."id"`;

const everyRootIsListed = `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."Block" AS block
  JOIN "public"."Space" AS space ON space."id" = block."spaceId"
  WHERE block."type" = 'page' AND block."parentId" IS NULL AND NOT (block."id" = ANY (space."rootPageIds"))
)`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Space',
        column: col('rootPageIds', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      rawSql({
        id: 'backfill.Space.rootPageIds',
        label: 'List the top-level pages of each space in the order they had',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          { description: 'fill "Space"."rootPageIds" from the top-level page blocks', sql: backfillRootPageIds },
        ],
        postcheck: [{ description: 'every top-level page block is listed by its space', sql: everyRootIsListed }],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
