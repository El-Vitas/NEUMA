#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/89d5dc74953b2cee64368ffd005871d78f50ee4f6c191d2e9a2cd9f6baeea8af/contract';
import endContract from '../../snapshots/89d5dc74953b2cee64368ffd005871d78f50ee4f6c191d2e9a2cd9f6baeea8af/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/d8cd53b7c78910ad6f1f6b97372a97cce8610fc69aa588e12cbea574ab8bd9b0/contract';
import startContract from '../../snapshots/d8cd53b7c78910ad6f1f6b97372a97cce8610fc69aa588e12cbea574ab8bd9b0/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, lit, rawSql } from '@prisma/orm-postgres/migration';

// ADR 026. The id of the transaction that wrote a block lets a reader ask for what changed since its snapshot without
// missing a transaction that commits late. Existing rows keep 0: they did not change after the migration. The column
// is a bigint because the contract has no xid8; the value is the xid8 as a number.

const createStampFunction = `
CREATE FUNCTION "public"."neuma_set_block_change_xid"() RETURNS trigger
LANGUAGE plpgsql VOLATILE AS $function$
BEGIN
  NEW."changeXid" := pg_current_xact_id()::text::bigint;
  RETURN NEW;
END
$function$`;

const createStampTrigger = `
CREATE TRIGGER "Block_change_xid_trigger" BEFORE INSERT OR UPDATE ON "public"."Block"
FOR EACH ROW EXECUTE FUNCTION "public"."neuma_set_block_change_xid"()`;

const triggerExists = `
SELECT count(*) = 1 AS "ok" FROM pg_trigger WHERE tgname = 'Block_change_xid_trigger' AND NOT tgisinternal`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Block',
        column: col('changeXid', 'int8', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/int8@1' },
        }),
      }),
      rawSql({
        id: 'function.neuma_set_block_change_xid',
        label: 'Create the function that stamps a block with the id of the transaction that writes it',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "neuma_set_block_change_xid"', sql: createStampFunction }],
        postcheck: [],
      }),
      rawSql({
        id: 'trigger.Block_change_xid_trigger',
        label: 'Stamp every write of a block with its transaction id',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [{ description: 'create "Block_change_xid_trigger"', sql: createStampTrigger }],
        postcheck: [{ description: 'the trigger exists', sql: triggerExists }],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Block',
        index: 'Block_parentId_changeXid_idx',
        columns: ['parentId', 'changeXid'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
