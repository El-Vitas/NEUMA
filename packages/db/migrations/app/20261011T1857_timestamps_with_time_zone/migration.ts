#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/13ae78a9b20094c08bdaa78fc7c9cee0cc1a45a72dc0a01ba604b08ba3652c0c/contract';
import startContract from '../../snapshots/13ae78a9b20094c08bdaa78fc7c9cee0cc1a45a72dc0a01ba604b08ba3652c0c/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/fdb73d4356c7fc6c800fe7e0f5919517129e1853b589be296ad2075326a98636/contract';
import endContract from '../../snapshots/fdb73d4356c7fc6c800fe7e0f5919517129e1853b589be296ad2075326a98636/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const DATE_COLUMNS_BY_TABLE: Readonly<Record<string, readonly string[]>> = {
  AccessToken: ['createdAt', 'expiresAt', 'lastUsedAt', 'revokedAt'],
  AgentAction: ['createdAt', 'finishedAt'],
  CollaborationSnapshot: ['createdAt', 'updatedAt'],
  FileAsset: ['createdAt', 'deletedAt', 'updatedAt'],
  OutboxEvent: ['createdAt', 'nextAttemptAt', 'processedAt'],
  Page: ['createdAt', 'lockedAt', 'trashedAt', 'updatedAt', 'verificationExpiresAt', 'verifiedAt'],
  PageBlock: ['updatedAt'],
  PageFavorite: ['createdAt'],
  PageLink: ['createdAt'],
  PageSchemaView: ['createdAt', 'updatedAt'],
  PageVersion: ['createdAt'],
  PageView: ['viewedAt'],
  SearchDocument: ['createdAt', 'updatedAt'],
  Space: ['createdAt', 'updatedAt'],
  SpaceMember: ['createdAt'],
  User: ['createdAt', 'updatedAt'],
  Workspace: ['createdAt', 'updatedAt'],
  WorkspaceMember: ['createdAt'],
};

const LIST_COLUMNS: readonly (readonly [string, string])[] = [
  ['AccessTokenGrant', 'permissions'],
  ['AccessTokenPageGrant', 'permissions'],
  ['AgentAction', 'blockIds'],
  ['PageBlock', 'headingPath'],
];

const OPTIONAL_JSON_COLUMNS: readonly (readonly [string, string])[] = [
  ['OutboxEvent', 'lastError'],
  ['Page', 'cover'],
  ['Page', 'icon'],
  ['Page', 'propertyValues'],
  ['PageSchemaProperty', 'options'],
  ['Space', 'icon'],
];

const quoted = (columns: readonly string[]): string => columns.map((column) => `'${column}'`).join(', ');

const countColumnsOfType = (table: string, columns: readonly string[], dataType: string): string =>
  `SELECT count(*) = ${String(columns.length)} FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '${table}' AND column_name IN (${quoted(columns)}) AND data_type = '${dataType}'`;

// Prisma 7 wrote every instant as UTC into a column without a time zone, so reading it AT TIME ZONE 'UTC'
// keeps the exact instant; the planner's plain cast would use whatever time zone the session happens to have.
const convertToTimestampWithTimeZone = (table: string, columns: readonly string[]) =>
  rawSql({
    id: `timestamptz.${table}`,
    label: `Store the dates of "${table}" with their time zone`,
    operationClass: 'widening',
    target: { id: 'postgres' },
    precheck: [
      {
        description: 'the columns still lack a time zone',
        sql: countColumnsOfType(table, columns, 'timestamp without time zone'),
      },
    ],
    execute: [
      {
        description: 'convert every date column in one table rewrite',
        sql: `ALTER TABLE "public"."${table}" ${columns
          .map((column) => `ALTER COLUMN "${column}" TYPE timestamptz USING "${column}" AT TIME ZONE 'UTC'`)
          .join(', ')}`,
      },
    ],
    postcheck: [
      {
        description: 'every date column has a time zone',
        sql: countColumnsOfType(table, columns, 'timestamp with time zone'),
      },
    ],
  });

const requireList = (table: string, column: string) =>
  rawSql({
    id: `not-null.${table}.${column}`,
    label: `Make "${table}"."${column}" required, as an empty list where it was null`,
    operationClass: 'data',
    target: { id: 'postgres' },
    precheck: [
      {
        description: 'the column still accepts null',
        sql: `SELECT is_nullable = 'YES' FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`,
      },
    ],
    execute: [
      { description: 'fill nulls', sql: `UPDATE "public"."${table}" SET "${column}" = '{}' WHERE "${column}" IS NULL` },
      { description: 'require it', sql: `ALTER TABLE "public"."${table}" ALTER COLUMN "${column}" SET NOT NULL` },
    ],
    postcheck: [
      {
        description: 'the column is required',
        sql: `SELECT is_nullable = 'NO' FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`,
      },
    ],
  });

const holdsJsonNull = (table: string, column: string): string =>
  `SELECT EXISTS (SELECT 1 FROM "public"."${table}" WHERE jsonb_typeof("${column}") = 'null')`;

// Prisma 7 stored an absent value as a JSON null; from here on it is SQL NULL, so a filter on IS NULL sees both.
const clearJsonNull = (table: string, column: string) =>
  rawSql({
    id: `json-null.${table}.${column}`,
    label: `Store an absent "${table}"."${column}" as SQL NULL`,
    operationClass: 'data',
    target: { id: 'postgres' },
    precheck: [{ description: 'some row holds a JSON null', sql: holdsJsonNull(table, column) }],
    execute: [
      {
        description: 'turn JSON nulls into SQL NULL',
        sql: `UPDATE "public"."${table}" SET "${column}" = NULL WHERE jsonb_typeof("${column}") = 'null'`,
      },
    ],
    postcheck: [{ description: 'no row holds a JSON null', sql: `SELECT NOT (${holdsJsonNull(table, column)})` }],
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...Object.entries(DATE_COLUMNS_BY_TABLE).map(([table, columns]) =>
        convertToTimestampWithTimeZone(table, columns),
      ),
      ...LIST_COLUMNS.map(([table, column]) => requireList(table, column)),
      ...OPTIONAL_JSON_COLUMNS.map(([table, column]) => clearJsonNull(table, column)),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
