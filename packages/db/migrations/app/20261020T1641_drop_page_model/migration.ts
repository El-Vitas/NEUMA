#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4222393bf79cbf8789788a0fda10abf1bbc8361c611e1066822f08a34af49215/contract';
import startContract from '../../snapshots/4222393bf79cbf8789788a0fda10abf1bbc8361c611e1066822f08a34af49215/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/5083241f092100d52c71e07d592503da95edb69bdb44fe6c018f68d52de1e10d/contract';
import endContract from '../../snapshots/5083241f092100d52c71e07d592503da95edb69bdb44fe6c018f68d52de1e10d/contract.json' with {
  type: 'json',
};
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'CollaborationSnapshot' }),
      this.dropTable({ schema: 'public', table: 'OutboxDelivery' }),
      this.dropTable({ schema: 'public', table: 'OutboxEvent' }),
      this.dropTable({ schema: 'public', table: 'PageBlock' }),
      this.dropTable({ schema: 'public', table: 'PageLink' }),
      this.dropTable({ schema: 'public', table: 'Page' }),
      this.dropTable({ schema: 'public', table: 'SearchDocument' }),
      this.dropNativeEnumType({ schema: 'public', typeName: 'OutboxConsumer' }),
      this.dropNativeEnumType({ schema: 'public', typeName: 'OutboxStatus' }),
      this.dropNativeEnumType({ schema: 'public', typeName: 'SearchIndexingState' }),
      this.dropNativeEnumType({ schema: 'public', typeName: 'SearchSourceType' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
