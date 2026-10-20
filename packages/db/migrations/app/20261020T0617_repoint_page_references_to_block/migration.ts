#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/03e484a78007ec7a86ab2d63c8b40063d74c20fedd9957450b83573fcd902f1d/contract';
import endContract from '../../snapshots/03e484a78007ec7a86ab2d63c8b40063d74c20fedd9957450b83573fcd902f1d/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/e34575adbfc072430535fef14dc2ab29be661c6fcf2a270a95cf87c6894da39e/contract';
import startContract from '../../snapshots/e34575adbfc072430535fef14dc2ab29be661c6fcf2a270a95cf87c6894da39e/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const referencingTables = [
  'AccessTokenPageGrant',
  'PageFavorite',
  'PageSchemaProperty',
  'PageSchemaView',
  'PageVersion',
  'PageView',
];

const hasNoOrphans = (table: string): string =>
  `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."${table}" AS referencing
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Block" AS block WHERE block."id" = referencing."pageId")
)`;

// Nothing is deleted: if a row points at a page that has no Block row, the migration stops before any change.
const assertNoOrphans = (table: string) =>
  rawSql({
    id: `orphans.${table}`,
    label: `Check that every "${table}"."pageId" exists in "Block"`,
    operationClass: 'data',
    target: { id: 'postgres' },
    precheck: [
      {
        description: `every "${table}"."pageId" has a "Block" row; migrate the missing pages to blocks first`,
        sql: hasNoOrphans(table),
      },
    ],
    execute: [{ description: 'nothing to change, this step only verifies', sql: 'SELECT 1' }],
    postcheck: [{ description: `no orphan in "${table}"`, sql: hasNoOrphans(table) }],
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...referencingTables.map(assertNoOrphans),
      this.dropConstraint({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        constraint: 'AccessTokenPageGrant_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'PageFavorite',
        constraint: 'PageFavorite_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'PageSchemaProperty',
        constraint: 'PageSchemaProperty_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'PageSchemaView',
        constraint: 'PageSchemaView_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'PageVersion',
        constraint: 'PageVersion_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'PageView',
        constraint: 'PageView_pageId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccessTokenPageGrant',
        foreignKey: {
          name: 'AccessTokenPageGrant_pageId_fkey',
          columns: ['pageId'],
          references: { schema: 'public', table: 'Block', columns: ['id'] },
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
          references: { schema: 'public', table: 'Block', columns: ['id'] },
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
          references: { schema: 'public', table: 'Block', columns: ['id'] },
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
          references: { schema: 'public', table: 'Block', columns: ['id'] },
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
          references: { schema: 'public', table: 'Block', columns: ['id'] },
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
          references: { schema: 'public', table: 'Block', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
