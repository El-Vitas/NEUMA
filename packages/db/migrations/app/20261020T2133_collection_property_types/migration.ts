#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/320028ff7455f2461c84b5e4c8cc6eb8157387f33a6acdba31a69fa798fafa99/contract';
import startContract from '../../snapshots/320028ff7455f2461c84b5e4c8cc6eb8157387f33a6acdba31a69fa798fafa99/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/ccffce6b1b5f94cf6fa5b6ef5e69d2bb6e95bde33a50d1bffa3986772973a498/contract';
import endContract from '../../snapshots/ccffce6b1b5f94cf6fa5b6ef5e69d2bb6e95bde33a50d1bffa3986772973a498/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, lit, rawSql } from '@prisma/orm-postgres/migration';

// ADR 024. The options of a selection get an id, and the rows, filters and column keys of the views that named an
// option by its text now name its id. A person becomes a list, and a date becomes { start }.

// Rewrites the option names inside a filter (any depth of groups) to ids, and moves the person operators to the
// ones that fit a list. `names` is { propertyKey: { optionName: optionId } }.
const createRemapFilterFunction = `
CREATE FUNCTION "public"."neuma_remap_filter"(filter jsonb, names jsonb, person_keys jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE
  mapped jsonb;
  property_key text;
  current_value jsonb;
  next_value jsonb;
  next_operator text;
BEGIN
  IF filter IS NULL OR jsonb_typeof(filter) <> 'object' THEN
    RETURN filter;
  END IF;
  IF filter ->> 'kind' = 'GROUP' THEN
    SELECT COALESCE(jsonb_agg("public"."neuma_remap_filter"(item, names, person_keys) ORDER BY position), '[]'::jsonb)
    INTO mapped
    FROM jsonb_array_elements(COALESCE(filter -> 'conditions', '[]'::jsonb)) WITH ORDINALITY AS each(item, position);
    RETURN jsonb_set(filter, '{conditions}', mapped);
  END IF;
  property_key := filter ->> 'propertyKey';
  IF property_key IS NOT NULL AND names -> property_key IS NOT NULL THEN
    current_value := filter -> 'value';
    IF jsonb_typeof(current_value) = 'string' THEN
      next_value := COALESCE(to_jsonb(names -> property_key ->> (current_value #>> '{}')), current_value);
    ELSIF jsonb_typeof(current_value) = 'array' THEN
      SELECT COALESCE(jsonb_agg(COALESCE(to_jsonb(names -> property_key ->> each.name), to_jsonb(each.name)) ORDER BY position), '[]'::jsonb)
      INTO next_value
      FROM jsonb_array_elements_text(current_value) WITH ORDINALITY AS each(name, position);
    ELSE
      next_value := current_value;
    END IF;
    RETURN jsonb_set(filter, '{value}', COALESCE(next_value, 'null'::jsonb));
  END IF;
  IF property_key IS NOT NULL AND person_keys @> to_jsonb(property_key) THEN
    next_operator := CASE filter ->> 'operator'
      WHEN 'IS' THEN 'CONTAINS'
      WHEN 'IS_NOT' THEN 'NOT_CONTAINS'
      ELSE filter ->> 'operator'
    END;
    RETURN jsonb_set(filter, '{operator}', to_jsonb(next_operator));
  END IF;
  RETURN filter;
END
$function$`;

// A column of a board is named by the text of the option it groups by; the view keeps it in collapsedGroups and
// columnLimits. The column of the first grouping wins over the one of the second.
const createMapGroupNameFunction = `
CREATE FUNCTION "public"."neuma_map_group_name"(names jsonb, configuration jsonb, group_name text) RETURNS text
LANGUAGE sql IMMUTABLE AS $function$
  SELECT COALESCE(
    names -> (configuration ->> 'groupBy') ->> group_name,
    names -> (configuration ->> 'subGroupBy') ->> group_name,
    group_name
  )
$function$`;

const moveOptionsToIds = `
DO $migration$
DECLARE
  property record;
  view_row record;
  next_configuration jsonb;
  total_values integer := 0;
  moved_values integer := 0;
  unresolved_total integer := 0;
  moved_persons integer := 0;
  moved_dates integer := 0;
  dropped_dates integer := 0;
  count_before integer;
  count_after integer;
BEGIN
  CREATE TEMP TABLE "option_map" ON COMMIT DROP AS
  SELECT
    schema_property."id" AS "propertyId",
    schema_property."pageId",
    schema_property."key" AS "propertyKey",
    CASE jsonb_typeof(item) WHEN 'string' THEN item #>> '{}' ELSE item ->> 'value' END AS "name",
    CASE jsonb_typeof(item) WHEN 'string' THEN NULL ELSE item ->> 'color' END AS "color",
    substr(md5(schema_property."id" || ':' || position::text), 1, 8) AS "optionId",
    position
  FROM "public"."PageSchemaProperty" AS schema_property
  CROSS JOIN LATERAL jsonb_array_elements(schema_property."options") WITH ORDINALITY AS each(item, position)
  WHERE schema_property."type" IN ('SELECT', 'MULTI_SELECT') AND jsonb_typeof(schema_property."options") = 'array';

  UPDATE "public"."PageSchemaProperty" AS schema_property
  SET "options" = (
    SELECT jsonb_agg(jsonb_build_object('id', mapped."optionId", 'value', mapped."name", 'color', mapped."color") ORDER BY mapped.position)
    FROM "option_map" AS mapped
    WHERE mapped."propertyId" = schema_property."id"
  )
  WHERE schema_property."id" IN (SELECT "propertyId" FROM "option_map");

  FOR property IN
    SELECT "id", "pageId", "key", "type" FROM "public"."PageSchemaProperty" WHERE "type" IN ('SELECT', 'MULTI_SELECT')
  LOOP
    IF property."type" = 'SELECT' THEN
      SELECT count(*) INTO count_before FROM "public"."Block" AS row_block
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string';
      total_values := total_values + count_before;
      UPDATE "public"."Block" AS row_block
      SET "properties" = jsonb_set(
        row_block."properties",
        ARRAY['values', property."key"],
        COALESCE((
          SELECT to_jsonb(mapped."optionId") FROM "option_map" AS mapped
          WHERE mapped."propertyId" = property."id" AND mapped."name" = row_block."properties" -> 'values' ->> property."key"
          LIMIT 1
        ), 'null'::jsonb)
      )
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string';
      SELECT count(*) INTO count_after FROM "public"."Block" AS row_block
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string';
      moved_values := moved_values + count_after;
      UPDATE "public"."Block" AS row_block
      SET "properties" = row_block."properties" #- ARRAY['values', property."key"]
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'null';
    ELSE
      SELECT COALESCE(sum(jsonb_array_length(row_block."properties" -> 'values' -> property."key")), 0) INTO count_before
      FROM "public"."Block" AS row_block
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'array';
      total_values := total_values + count_before;
      UPDATE "public"."Block" AS row_block
      SET "properties" = jsonb_set(
        row_block."properties",
        ARRAY['values', property."key"],
        COALESCE((
          SELECT jsonb_agg(mapped."optionId" ORDER BY entry.position)
          FROM jsonb_array_elements_text(row_block."properties" -> 'values' -> property."key") WITH ORDINALITY AS entry(name, position)
          JOIN "option_map" AS mapped ON mapped."propertyId" = property."id" AND mapped."name" = entry.name
        ), '[]'::jsonb)
      )
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'array';
      SELECT COALESCE(sum(jsonb_array_length(row_block."properties" -> 'values' -> property."key")), 0) INTO count_after
      FROM "public"."Block" AS row_block
      WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'array';
      moved_values := moved_values + count_after;
      UPDATE "public"."Block" AS row_block
      SET "properties" = row_block."properties" #- ARRAY['values', property."key"]
      WHERE row_block."parentId" = property."pageId" AND row_block."properties" -> 'values' -> property."key" = '[]'::jsonb;
    END IF;
  END LOOP;
  unresolved_total := total_values - moved_values;

  FOR property IN
    SELECT "pageId", "key" FROM "public"."PageSchemaProperty" WHERE "type" = 'PERSON'
  LOOP
    UPDATE "public"."Block" AS row_block
    SET "properties" = jsonb_set(row_block."properties", ARRAY['values', property."key"], jsonb_build_array(row_block."properties" -> 'values' -> property."key"))
    WHERE row_block."parentId" = property."pageId"
      AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string'
      AND row_block."properties" -> 'values' ->> property."key" <> '';
    GET DIAGNOSTICS count_after = ROW_COUNT;
    moved_persons := moved_persons + count_after;
    UPDATE "public"."Block" AS row_block
    SET "properties" = row_block."properties" #- ARRAY['values', property."key"]
    WHERE row_block."parentId" = property."pageId"
      AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string';
  END LOOP;

  FOR property IN
    SELECT "pageId", "key" FROM "public"."PageSchemaProperty" WHERE "type" = 'DATE'
  LOOP
    UPDATE "public"."Block" AS row_block
    SET "properties" = jsonb_set(
      row_block."properties",
      ARRAY['values', property."key"],
      jsonb_build_object('start',
        CASE
          WHEN row_block."properties" -> 'values' ->> property."key" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN row_block."properties" -> 'values' ->> property."key"
          WHEN row_block."properties" -> 'values' ->> property."key" ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,3})?)?(Z|[+-]\\d{2}:\\d{2})$' THEN row_block."properties" -> 'values' ->> property."key"
          WHEN row_block."properties" -> 'values' ->> property."key" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN left(row_block."properties" -> 'values' ->> property."key", 10)
          ELSE NULL
        END
      )
    )
    WHERE row_block."parentId" = property."pageId" AND jsonb_typeof(row_block."properties" -> 'values' -> property."key") = 'string';
    GET DIAGNOSTICS count_after = ROW_COUNT;
    moved_dates := moved_dates + count_after;
    UPDATE "public"."Block" AS row_block
    SET "properties" = row_block."properties" #- ARRAY['values', property."key"]
    WHERE row_block."parentId" = property."pageId"
      AND jsonb_typeof(row_block."properties" -> 'values' -> property."key" -> 'start') = 'null';
    GET DIAGNOSTICS count_after = ROW_COUNT;
    dropped_dates := dropped_dates + count_after;
  END LOOP;

  CREATE TEMP TABLE "page_lookup" ON COMMIT DROP AS
  SELECT
    pages."pageId",
    COALESCE((
      SELECT jsonb_object_agg(per_property."propertyKey", per_property."names")
      FROM (
        SELECT mapped."propertyKey", jsonb_object_agg(mapped."name", mapped."optionId") AS "names"
        FROM "option_map" AS mapped WHERE mapped."pageId" = pages."pageId" GROUP BY mapped."propertyKey"
      ) AS per_property
    ), '{}'::jsonb) AS "names",
    COALESCE((
      SELECT jsonb_agg(person."key") FROM "public"."PageSchemaProperty" AS person
      WHERE person."pageId" = pages."pageId" AND person."type" = 'PERSON'
    ), '[]'::jsonb) AS "personKeys"
  FROM (SELECT DISTINCT "pageId" FROM "public"."PageSchemaView") AS pages;

  FOR view_row IN
    SELECT schema_view."id", schema_view."configuration", lookup."names", lookup."personKeys"
    FROM "public"."PageSchemaView" AS schema_view
    JOIN "page_lookup" AS lookup ON lookup."pageId" = schema_view."pageId"
  LOOP
    next_configuration := view_row."configuration";
    IF jsonb_typeof(next_configuration -> 'filter') = 'object' THEN
      next_configuration := jsonb_set(
        next_configuration, '{filter}',
        "public"."neuma_remap_filter"(next_configuration -> 'filter', view_row."names", view_row."personKeys")
      );
    END IF;
    IF jsonb_typeof(next_configuration -> 'collapsedGroups') = 'array' THEN
      next_configuration := jsonb_set(
        next_configuration, '{collapsedGroups}',
        COALESCE((
          SELECT jsonb_agg("public"."neuma_map_group_name"(view_row."names", next_configuration, entry.name) ORDER BY entry.position)
          FROM jsonb_array_elements_text(next_configuration -> 'collapsedGroups') WITH ORDINALITY AS entry(name, position)
        ), '[]'::jsonb)
      );
    END IF;
    IF jsonb_typeof(next_configuration -> 'columnLimits') = 'object' THEN
      next_configuration := jsonb_set(
        next_configuration, '{columnLimits}',
        COALESCE((
          SELECT jsonb_object_agg("public"."neuma_map_group_name"(view_row."names", next_configuration, entry.key), entry.value)
          FROM jsonb_each(next_configuration -> 'columnLimits') AS entry(key, value)
        ), '{}'::jsonb)
      );
    END IF;
    IF next_configuration <> view_row."configuration" THEN
      UPDATE "public"."PageSchemaView" SET "configuration" = next_configuration WHERE "id" = view_row."id";
    END IF;
  END LOOP;

  RAISE WARNING 'collection property types migration: % option values found, % moved to ids, % named an option the property does not have and were dropped',
    total_values, moved_values, unresolved_total;
  RAISE WARNING 'collection property types migration: % person values turned into lists, % dates wrapped, % dates dropped because they were not a date',
    moved_persons, moved_dates, dropped_dates;
END
$migration$`;

const everyOptionHasAnId = `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."PageSchemaProperty" AS schema_property
  CROSS JOIN LATERAL jsonb_array_elements(schema_property."options") AS each(item)
  WHERE schema_property."type" IN ('SELECT', 'MULTI_SELECT')
    AND jsonb_typeof(schema_property."options") = 'array'
    AND (jsonb_typeof(item) <> 'object' OR item -> 'id' IS NULL)
)`;

const noRowKeepsAPersonAsText = `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."PageSchemaProperty" AS schema_property
  JOIN "public"."Block" AS row_block ON row_block."parentId" = schema_property."pageId"
  WHERE schema_property."type" = 'PERSON'
    AND jsonb_typeof(row_block."properties" -> 'values' -> schema_property."key") = 'string'
)`;

const noRowKeepsADateAsText = `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."PageSchemaProperty" AS schema_property
  JOIN "public"."Block" AS row_block ON row_block."parentId" = schema_property."pageId"
  WHERE schema_property."type" = 'DATE'
    AND jsonb_typeof(row_block."properties" -> 'values' -> schema_property."key") = 'string'
)`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'STATUS' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'RELATION' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'URL' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'EMAIL' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'PHONE' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'FILES' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'CREATED_TIME' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'EDITED_TIME' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'CREATED_BY' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'EDITED_BY' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'DatabasePropertyType', value: 'UNIQUE_ID' }),
      this.addColumn({
        schema: 'public',
        table: 'PageSchemaProperty',
        column: col('config', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PageSchemaProperty',
        column: col('nextValue', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      rawSql({
        id: 'function.neuma_remap_filter',
        label: 'Create the helper that moves a filter from option names to ids',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_remap_filter"', sql: createRemapFilterFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'function.neuma_map_group_name',
        label: 'Create the helper that moves a board column name to an option id',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_map_group_name"', sql: createMapGroupNameFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'backfill.PageSchemaProperty.optionIds',
        label: 'Give each option an id and move rows and views from names to ids, persons to lists, dates to ranges',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'rewrite options, rows and views', sql: moveOptionsToIds }],
        postcheck: [
          { description: 'every option has an id', sql: everyOptionHasAnId },
          { description: 'no row keeps a person as text', sql: noRowKeepsAPersonAsText },
          { description: 'no row keeps a date as text', sql: noRowKeepsADateAsText },
        ],
      }),
      rawSql({
        id: 'function.drop.neuma_remap_filter',
        label: 'Drop the helper that moved a filter from option names to ids',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'drop "neuma_remap_filter"',
            sql: 'DROP FUNCTION "public"."neuma_remap_filter"(jsonb, jsonb, jsonb)',
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'function.drop.neuma_map_group_name',
        label: 'Drop the helper that moved a board column name to an option id',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'drop "neuma_map_group_name"',
            sql: 'DROP FUNCTION "public"."neuma_map_group_name"(jsonb, jsonb, text)',
          },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
