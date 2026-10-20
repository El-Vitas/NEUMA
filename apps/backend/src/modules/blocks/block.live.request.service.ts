import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BlockLiveAccessService } from './block.live.access.service';
import { BlockTransactionsService } from './block.transactions.service';
import { BlocksService } from './blocks.service';
import { BLOCK_LIVE_ERROR_CODE } from './domain/block.live.constants';
import { BlockLiveWriteLimiter } from './infrastructure/throttling/block.live.write.limiter';
import type {
  BlockLiveAnswer,
  BlockLiveLogger,
  BlockLiveReaderRefresher,
  BlockLiveReplyMessage,
  BlockLiveRequestAnswerer,
  BlockLiveRequestMessage,
  BlockLiveSyncMessage,
  BlockLiveSyncReader,
  BlockLiveTransactionsApplier,
  BlockLiveTransactionsMessage,
  BlockLiveWriteLimit,
} from './types/block.live.types';
import type { BlockReader, BlockSyncRequest } from './types/blocks.types';

const toSyncRequest = (message: BlockLiveSyncMessage): BlockSyncRequest =>
  'pageId' in message ? { kind: 'page', pageId: message.pageId } : { blocks: message.blocks, kind: 'changed' };

const toErrorReply = (requestId: string, code: string): BlockLiveReplyMessage => ({
  code,
  requestId,
  type: 'error',
});

/** Runs the requests of a socket through the same services as the HTTP endpoints. */
@Injectable()
export class BlockLiveRequestService implements BlockLiveRequestAnswerer {
  constructor(
    @Inject(BlockLiveAccessService) private readonly accounts: BlockLiveReaderRefresher,
    @Inject(BlockLiveWriteLimiter) private readonly writeLimit: BlockLiveWriteLimit,
    @Inject(BlockTransactionsService) private readonly transactions: BlockLiveTransactionsApplier,
    @Inject(BlocksService) private readonly blocks: BlockLiveSyncReader,
    @Inject(PinoLogger) private readonly logger: BlockLiveLogger,
  ) {}

  /** The account is read again for every request, so a demotion or a deactivation counts on the next one. */
  async answer(reader: BlockReader, message: BlockLiveRequestMessage): Promise<BlockLiveAnswer> {
    try {
      const refreshed = await this.accounts.refreshReaders([reader]);
      const current = refreshed.readers[0];
      if (current === undefined) return { kind: 'inactive' };
      return { kind: 'reply', message: await this.reply(current, message) };
    } catch (error) {
      this.logger.error({ err: error, requestId: message.requestId }, 'live channel request failed');
      return { kind: 'reply', message: toErrorReply(message.requestId, BLOCK_LIVE_ERROR_CODE.internal) };
    }
  }

  private reply(reader: BlockReader, message: BlockLiveRequestMessage): Promise<BlockLiveReplyMessage> {
    if (message.type === 'transactions') return this.applyTransactions(reader, message);
    return this.readBlocks(reader, message);
  }

  private async applyTransactions(
    reader: BlockReader,
    message: BlockLiveTransactionsMessage,
  ): Promise<BlockLiveReplyMessage> {
    if (!(await this.writeLimit.isAllowed(reader.userId))) {
      return toErrorReply(message.requestId, BLOCK_LIVE_ERROR_CODE.rateLimited);
    }
    const response = await this.transactions.apply(message.transactions, reader);
    return { requestId: message.requestId, transactions: response.transactions, type: 'transactionsResult' };
  }

  private async readBlocks(reader: BlockReader, message: BlockLiveSyncMessage): Promise<BlockLiveReplyMessage> {
    const result = await this.blocks.sync(toSyncRequest(message), reader);
    if (result.isFail()) return toErrorReply(message.requestId, result.getError().code);
    return { ...result.getValue(), requestId: message.requestId, type: 'syncResult' };
  }
}
