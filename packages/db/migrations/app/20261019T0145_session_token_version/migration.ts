#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/97e75778ff833a1e2e4e43af107ddad31df8eea6f1d710471e1b578151e31d5a/contract';
import endContract from '../../snapshots/97e75778ff833a1e2e4e43af107ddad31df8eea6f1d710471e1b578151e31d5a/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/efa02afd121c2a097491c0a23026a4fdad577a2102dcf7f1d2239e5421e742ce/contract';
import startContract from '../../snapshots/efa02afd121c2a097491c0a23026a4fdad577a2102dcf7f1d2239e5421e742ce/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('tokenVersion', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
