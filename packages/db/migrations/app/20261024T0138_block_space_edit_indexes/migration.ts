#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0fd1352cbe30e21a48f4fd41f7b51ba0437b0a708bf829e4f343dffb58fd9a4c/contract';
import endContract from '../../snapshots/0fd1352cbe30e21a48f4fd41f7b51ba0437b0a708bf829e4f343dffb58fd9a4c/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/bebe6bf2b37a2ece7a33f798ca44592f439fbd42f62697d8ac80ad6023567da4/contract';
import startContract from '../../snapshots/bebe6bf2b37a2ece7a33f798ca44592f439fbd42f62697d8ac80ad6023567da4/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const isTrue = (description: string, sql: string) => [{ description, sql }];

const indexExists = (name: string): string =>
  `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${name}')`;

const expressionIndex = (name: string, expression: string) =>
  rawSql({
    id: `index.Block.${name}`,
    label: `Create index "${name}"`,
    operationClass: 'additive',
    target: { id: 'postgres' },
    precheck: isTrue('not done yet', `SELECT NOT (${indexExists(name).replace('SELECT ', '')})`),
    execute: isTrue(`Create index "${name}"`, `CREATE INDEX "${name}" ON "public"."Block" ((${expression}))`),
    postcheck: isTrue('done', indexExists(name)),
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_spaceId_changeXid_idx',
        columns: ['spaceId', 'changeXid'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_spaceId_editedAt_idx',
        columns: ['spaceId', 'editedAt'],
      }),
      expressionIndex('Block_properties_assetId_idx', `properties->>'assetId'`),
      expressionIndex('Block_format_icon_assetId_idx', `format->'icon'->>'assetId'`),
      expressionIndex('Block_format_cover_assetId_idx', `format->'cover'->>'assetId'`),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
