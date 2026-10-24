#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/89d5dc74953b2cee64368ffd005871d78f50ee4f6c191d2e9a2cd9f6baeea8af/contract';
import startContract from '../../snapshots/89d5dc74953b2cee64368ffd005871d78f50ee4f6c191d2e9a2cd9f6baeea8af/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/9970e97ad3f0138b9e610ebfce7fe6c205245c7be7c30b3077673c092c48225a/contract';
import endContract from '../../snapshots/9970e97ad3f0138b9e610ebfce7fe6c205245c7be7c30b3077673c092c48225a/contract.json' with {
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
        typeName: 'DatabaseViewType',
        value: 'TIMELINE',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
