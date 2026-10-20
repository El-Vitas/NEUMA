import { setTimeout as sleep } from 'node:timers/promises';
import { Injectable } from '@nestjs/common';
import { isRetryableTransactionFailure } from '@neuma/db';
import { Result } from '@neuma/shared';
import type { DomainError } from '../../../../common/domain/domain.error';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  BLOCK_TRANSACTION_MAX_ATTEMPTS,
  BLOCK_TRANSACTION_RETRY_BACKOFF_MS,
} from '../../constants/block.transaction.constants';
import type { BlockTransactionRepositoryContract, BlockTransactionSession } from '../../types/block.transaction.types';
import { PostgresBlockTransactionSession } from './block.transaction.session';

/** Carries a domain failure out of the Postgres transaction, so the transaction rolls back instead of committing. */
class BlockTransactionRollback extends Error {
  constructor(readonly failure: DomainError) {
    super(failure.message);
  }
}

@Injectable()
export class BlockTransactionRepository implements BlockTransactionRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs the whole client transaction again when Postgres rolled it back as the victim of a deadlock or a
   * serialization failure, a bounded number of times with a growing pause. Everything else is rethrown at once.
   */
  async run<Value>(
    work: (session: BlockTransactionSession) => Promise<Result<Value, DomainError>>,
  ): Promise<Result<Value, DomainError>> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.runOnce(work);
      } catch (error) {
        if (!isRetryableTransactionFailure(error) || attempt >= BLOCK_TRANSACTION_MAX_ATTEMPTS) throw error;
        await sleep(BLOCK_TRANSACTION_RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  private async runOnce<Value>(
    work: (session: BlockTransactionSession) => Promise<Result<Value, DomainError>>,
  ): Promise<Result<Value, DomainError>> {
    try {
      return await this.prisma.transaction(async (transaction) => {
        const outcome = await work(new PostgresBlockTransactionSession(this.prisma, transaction));
        if (outcome.isFail()) throw new BlockTransactionRollback(outcome.getError());
        return outcome;
      });
    } catch (error) {
      if (error instanceof BlockTransactionRollback) return Result.fail(error.failure);
      throw error;
    }
  }
}
