#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/01ceaee91c400b3db5a5b619540972ff8a0cb4b116d8bf49c55570c90aeeaaa6/contract';
import endContract from '../../snapshots/01ceaee91c400b3db5a5b619540972ff8a0cb4b116d8bf49c55570c90aeeaaa6/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/fdb73d4356c7fc6c800fe7e0f5919517129e1853b589be296ad2075326a98636/contract';
import startContract from '../../snapshots/fdb73d4356c7fc6c800fe7e0f5919517129e1853b589be296ad2075326a98636/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const UNIQUE_INDEXES_BY_TABLE: readonly (readonly [string, string])[] = [
  ['AccessToken', 'AccessToken_secretHash_key'],
  ['AccessTokenGrant', 'AccessTokenGrant_tokenId_spaceId_key'],
  ['AccessTokenPageGrant', 'AccessTokenPageGrant_tokenId_pageId_key'],
  ['CollaborationSnapshot', 'CollaborationSnapshot_documentName_key'],
  ['FileAsset', 'FileAsset_storageKey_key'],
  ['OutboxEvent', 'OutboxEvent_idempotencyKey_key'],
  ['PageFavorite', 'PageFavorite_userId_pageId_key'],
  ['PageLink', 'PageLink_sourcePageId_targetPageId_key'],
  ['PageSchemaProperty', 'PageSchemaProperty_pageId_key_key'],
  ['PageSchemaView', 'PageSchemaView_pageId_name_key'],
  ['PageVersion', 'PageVersion_pageId_version_key'],
  ['SearchDocument', 'SearchDocument_sourceType_sourceId_key'],
  ['Space', 'Space_workspaceId_slug_key'],
  ['SpaceMember', 'SpaceMember_spaceId_userId_key'],
  ['User', 'User_email_key'],
  ['Workspace', 'Workspace_singletonKey_key'],
  ['WorkspaceMember', 'WorkspaceMember_workspaceId_userId_key'],
];

const constraintExists = (name: string): string =>
  `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}' AND contype = 'u')`;

// The planner drops each index and adds a constraint, which rebuilds it and leaves the table without the rule in
// between. USING INDEX keeps the index that already enforces uniqueness and only records it as a constraint.
const promoteToConstraint = (table: string, name: string) =>
  rawSql({
    id: `unique.${name}`,
    label: `Record "${name}" as a unique constraint`,
    operationClass: 'additive',
    target: { id: 'postgres' },
    precheck: [{ description: 'not a constraint yet', sql: `SELECT NOT (${constraintExists(name)})` }],
    execute: [
      {
        description: 'promote the existing unique index',
        sql: `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${name}" UNIQUE USING INDEX "${name}"`,
      },
    ],
    postcheck: [{ description: 'it is a constraint', sql: constraintExists(name) }],
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return UNIQUE_INDEXES_BY_TABLE.map(([table, name]) => promoteToConstraint(table, name));
  }
}

MigrationCLI.run(import.meta.url, M);
