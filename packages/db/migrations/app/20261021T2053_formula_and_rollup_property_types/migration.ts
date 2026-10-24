#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9970e97ad3f0138b9e610ebfce7fe6c205245c7be7c30b3077673c092c48225a/contract';
import startContract from '../../snapshots/9970e97ad3f0138b9e610ebfce7fe6c205245c7be7c30b3077673c092c48225a/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/bebe6bf2b37a2ece7a33f798ca44592f439fbd42f62697d8ac80ad6023567da4/contract';
import endContract from '../../snapshots/bebe6bf2b37a2ece7a33f798ca44592f439fbd42f62697d8ac80ad6023567da4/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addNativeEnumValue({
        schema: 'public',
        typeName: 'DatabasePropertyType',
        value: 'FORMULA',
      }),
      this.addNativeEnumValue({
        schema: 'public',
        typeName: 'DatabasePropertyType',
        value: 'ROLLUP',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
