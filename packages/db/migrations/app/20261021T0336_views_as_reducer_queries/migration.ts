#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/ccffce6b1b5f94cf6fa5b6ef5e69d2bb6e95bde33a50d1bffa3986772973a498/contract';
import startContract from '../../snapshots/ccffce6b1b5f94cf6fa5b6ef5e69d2bb6e95bde33a50d1bffa3986772973a498/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/d8cd53b7c78910ad6f1f6b97372a97cce8610fc69aa588e12cbea574ab8bd9b0/contract';
import endContract from '../../snapshots/d8cd53b7c78910ad6f1f6b97372a97cce8610fc69aa588e12cbea574ab8bd9b0/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, lit, rawSql } from '@prisma/orm-postgres/migration';

// ADR 025. A view keeps its own manual order and a version, every node of a filter gets an id so it can be edited
// alone, and the rows of a collection get the partial index its queries read in order.

const createRowsOrderIndex = `
CREATE INDEX "Block_rows_order_idx" ON "public"."Block" ("parentId", "createdAt", "id")
WHERE "type" = 'page' AND "lifecycle" = 'ACTIVE'`;

// Gives an id to a filter node and, recursively, to every node of its groups. A node that already has one keeps it.
const createIdentifyFilterFunction = `
CREATE FUNCTION "public"."neuma_identify_filter"(filter jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE AS $function$
DECLARE
  identified jsonb;
BEGIN
  IF filter IS NULL OR jsonb_typeof(filter) <> 'object' THEN
    RETURN filter;
  END IF;
  IF filter ->> 'kind' = 'GROUP' THEN
    SELECT COALESCE(jsonb_agg("public"."neuma_identify_filter"(item) ORDER BY position), '[]'::jsonb)
    INTO identified
    FROM jsonb_array_elements(COALESCE(filter -> 'conditions', '[]'::jsonb)) WITH ORDINALITY AS each(item, position);
    filter := jsonb_set(filter, '{conditions}', identified);
  END IF;
  IF filter ->> 'id' IS NULL THEN
    filter := filter || jsonb_build_object('id', substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  END IF;
  RETURN filter;
END
$function$`;

const countFilterNodesFunction = `
CREATE FUNCTION "public"."neuma_count_filter_nodes"(filter jsonb) RETURNS integer
LANGUAGE sql IMMUTABLE AS $function$
  SELECT CASE
    WHEN filter IS NULL OR jsonb_typeof(filter) <> 'object' THEN 0
    WHEN filter ->> 'kind' = 'GROUP' THEN 1 + COALESCE((
      SELECT sum("public"."neuma_count_filter_nodes"(item))::integer
      FROM jsonb_array_elements(COALESCE(filter -> 'conditions', '[]'::jsonb)) AS each(item)
    ), 0)
    ELSE 1
  END
$function$`;

const identifyFiltersAndAddGroupKeys = `
DO $migration$
DECLARE
  nodes_before integer;
  nodes_after integer;
BEGIN
  SELECT COALESCE(sum("public"."neuma_count_filter_nodes"("configuration" -> 'filter')), 0) INTO nodes_before
  FROM "public"."PageSchemaView";

  UPDATE "public"."PageSchemaView"
  SET "configuration" = jsonb_set(
    "configuration",
    '{filter}',
    "public"."neuma_identify_filter"("configuration" -> 'filter')
  )
  WHERE jsonb_typeof("configuration" -> 'filter') = 'object';

  UPDATE "public"."PageSchemaView"
  SET "configuration" =
    CASE WHEN "configuration" ? 'hiddenGroups' THEN "configuration" ELSE "configuration" || '{"hiddenGroups": []}'::jsonb END
    || CASE WHEN "configuration" ? 'groupByMode' THEN '{}'::jsonb ELSE '{"groupByMode": "OPTION"}'::jsonb END;

  SELECT COALESCE(sum("public"."neuma_count_filter_nodes"("configuration" -> 'filter')), 0) INTO nodes_after
  FROM "public"."PageSchemaView";
  IF nodes_before <> nodes_after THEN
    RAISE EXCEPTION 'Filter nodes changed from % to %', nodes_before, nodes_after;
  END IF;
END
$migration$`;

const everyFilterNodeHasAnId = `
SELECT count(*) = 0 AS "ok" FROM "public"."PageSchemaView" AS view_row
WHERE jsonb_typeof(view_row."configuration" -> 'filter') = 'object' AND view_row."configuration" -> 'filter' ->> 'id' IS NULL`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'PageSchemaView',
        column: col('manualOrder', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PageSchemaView',
        column: col('version', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      rawSql({
        id: 'index.Block_rows_order_idx',
        label: 'Create the partial index that reads the rows of a collection in order',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "Block_rows_order_idx"', sql: createRowsOrderIndex }],
        postcheck: [],
      }),
      rawSql({
        id: 'function.neuma_identify_filter',
        label: 'Create the helper that gives each filter node an id',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_identify_filter"', sql: createIdentifyFilterFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'function.neuma_count_filter_nodes',
        label: 'Create the helper that counts the nodes of a filter',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_count_filter_nodes"', sql: countFilterNodesFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'backfill.PageSchemaView.filterIds',
        label: 'Give each filter node an id and add the hidden groups and the status grouping mode to each view',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'identify filter nodes', sql: identifyFiltersAndAddGroupKeys }],
        postcheck: [{ description: 'every filter node has an id', sql: everyFilterNodeHasAnId }],
      }),
      rawSql({
        id: 'function.drop.neuma_identify_filter',
        label: 'Drop the helper that gave each filter node an id',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          { description: 'drop "neuma_identify_filter"', sql: 'DROP FUNCTION "public"."neuma_identify_filter"(jsonb)' },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'function.drop.neuma_count_filter_nodes',
        label: 'Drop the helper that counted the nodes of a filter',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'drop "neuma_count_filter_nodes"',
            sql: 'DROP FUNCTION "public"."neuma_count_filter_nodes"(jsonb)',
          },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
