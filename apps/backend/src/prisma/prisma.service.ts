import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createNeumaDatabase, type NeumaDatabase, type NeumaTransaction } from '@neuma/db';
import type { NeumaModels, NeumaSqlRunner, NeumaSqlTag, NeumaTables } from './types/prisma.types';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly database: NeumaDatabase;

  constructor(configService: ConfigService) {
    this.database = createNeumaDatabase(configService.getOrThrow<string>('DATABASE_URL'));
  }

  get models(): NeumaModels {
    return this.database.orm.public;
  }

  /** Column codecs for `.returnsRow(...)`, as `tables.Page.columns.title`. */
  get tables(): NeumaTables {
    return this.database.sql.public;
  }

  /** Raw statements built with it run through `runner` or a transaction's `query` and `execute`. */
  get sql(): NeumaSqlTag {
    return this.database.raw.sql;
  }

  get runner(): NeumaSqlRunner {
    return this.database.runtime();
  }

  /** The caller's transaction when there is one, so a repository method works inside or outside it. */
  modelsFor(transaction: NeumaTransaction | undefined): NeumaModels {
    return transaction === undefined ? this.models : transaction.orm.public;
  }

  runnerFor(transaction: NeumaTransaction | undefined): NeumaSqlRunner {
    return transaction ?? this.runner;
  }

  // Nested calls do not nest: pass the transaction down instead of opening another one.
  transaction<Result>(work: (transaction: NeumaTransaction) => Promise<Result>): Promise<Result> {
    return this.database.transaction(work);
  }

  async onModuleDestroy(): Promise<void> {
    await this.database.close();
  }
}
