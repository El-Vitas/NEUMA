import { describe, expect, it } from 'bun:test';
import { Result, USER_ROLE, type UserRole } from '@neuma/shared';
import { BlockLiveRequestService } from '@/modules/blocks/block.live.request.service';
import { BlockAccessDeniedError } from '@/modules/blocks/domain/block.error';
import type {
  BlockLiveReaderRefresher,
  BlockLiveReplyMessage,
  BlockLiveRequestMessage,
  BlockLiveWriteLimit,
  RefreshedReaders,
} from '@/modules/blocks/types/block.live.types';
import type { BlockTransactionsResponse } from '@/modules/blocks/types/block.transaction.types';
import type {
  BlockReader,
  BlockSyncRequest,
  BlockSyncResponse,
  BlockSyncResult,
} from '@/modules/blocks/types/blocks.types';

const TOKEN_READER: BlockReader = { role: USER_ROLE.ADMIN, userId: 'user-1', workspaceId: 'workspace-1' };
const TRANSACTIONS_REQUEST: BlockLiveRequestMessage = {
  requestId: 'request-1',
  transactions: [{ id: 'transaction-1', operations: [{}], spaceId: 'space-1' }],
  type: 'transactions',
};
const PAGE_SYNC_REQUEST: BlockLiveRequestMessage = { pageId: 'page-1', requestId: 'request-2', type: 'sync' };
const CHANGED_SYNC_REQUEST: BlockLiveRequestMessage = {
  blocks: [{ id: 'block-1', version: 2 }],
  requestId: 'request-3',
  type: 'sync',
};

interface Harness {
  readonly appliedFor: BlockReader[];
  readonly limiterCalls: string[];
  readonly service: BlockLiveRequestService;
  readonly syncedFor: { reader: BlockReader; request: BlockSyncRequest }[];
}

const buildHarness = (
  options: { isAllowed?: boolean; role?: UserRole | null; syncResult?: BlockSyncResult; throwOnApply?: boolean } = {},
): Harness => {
  const appliedFor: BlockReader[] = [];
  const limiterCalls: string[] = [];
  const syncedFor: { reader: BlockReader; request: BlockSyncRequest }[] = [];
  const role = options.role === undefined ? USER_ROLE.CLIENT : options.role;
  const refresher: BlockLiveReaderRefresher = {
    refreshReaders: (readers): Promise<RefreshedReaders> =>
      Promise.resolve(
        role === null
          ? { readers: [], unavailableUserIds: new Set(readers.map((reader) => reader.userId)) }
          : { readers: readers.map((reader) => ({ ...reader, role })), unavailableUserIds: new Set() },
      ),
  };
  const limiter: BlockLiveWriteLimit = {
    isAllowed: (userId) => {
      limiterCalls.push(userId);
      return Promise.resolve(options.isAllowed ?? true);
    },
  };
  const applied: BlockTransactionsResponse = {
    transactions: [{ blocks: [{ id: 'block-1', version: 3 }], id: 'transaction-1', views: [] }],
  };
  const service = new BlockLiveRequestService(
    refresher,
    limiter,
    {
      apply: (_requests, reader) => {
        if (options.throwOnApply === true) return Promise.reject(new Error('database down'));
        appliedFor.push(reader);
        return Promise.resolve(applied);
      },
    },
    {
      sync: (request, reader) => {
        syncedFor.push({ reader, request });
        return Promise.resolve(options.syncResult ?? Result.ok({ blocks: [] }));
      },
    },
    { error: () => undefined },
  );
  return { appliedFor, limiterCalls, service, syncedFor };
};

const replyOf = async (
  service: BlockLiveRequestService,
  message: BlockLiveRequestMessage,
): Promise<BlockLiveReplyMessage> => {
  const answer = await service.answer(TOKEN_READER, message);
  if (answer.kind !== 'reply') throw new Error('Expected a reply');
  return answer.message;
};

describe('BlockLiveRequestService', () => {
  describe('transactions', () => {
    it('applies them as the user with the role the account has now, not the one of the token', async () => {
      const harness = buildHarness({ role: USER_ROLE.CLIENT });

      const reply = await replyOf(harness.service, TRANSACTIONS_REQUEST);

      expect(harness.appliedFor).toEqual([{ ...TOKEN_READER, role: USER_ROLE.CLIENT }]);
      expect(reply).toEqual({
        requestId: 'request-1',
        transactions: [{ blocks: [{ id: 'block-1', version: 3 }], id: 'transaction-1', views: [] }],
        type: 'transactionsResult',
      });
    });

    it('answers rate-limited, without applying anything, once the user is over the write limit', async () => {
      const harness = buildHarness({ isAllowed: false });

      const reply = await replyOf(harness.service, TRANSACTIONS_REQUEST);

      expect(reply).toEqual({ code: 'rate-limited', requestId: 'request-1', type: 'error' });
      expect(harness.appliedFor).toEqual([]);
      expect(harness.limiterCalls).toEqual(['user-1']);
    });

    it('answers an internal error that names the request when applying them fails', async () => {
      const harness = buildHarness({ throwOnApply: true });

      const reply = await replyOf(harness.service, TRANSACTIONS_REQUEST);

      expect(reply).toEqual({ code: 'internal-error', requestId: 'request-1', type: 'error' });
    });
  });

  describe('sync', () => {
    it('reads a page and answers what the HTTP endpoint answers, as the current role', async () => {
      const harness = buildHarness({ role: USER_ROLE.WORKER });

      const reply = await replyOf(harness.service, PAGE_SYNC_REQUEST);

      expect(harness.syncedFor).toEqual([
        { reader: { ...TOKEN_READER, role: USER_ROLE.WORKER }, request: { kind: 'page', pageId: 'page-1' } },
      ]);
      expect(reply).toEqual({ blocks: [], requestId: 'request-2', type: 'syncResult' });
      expect(harness.limiterCalls).toEqual([]);
    });

    it('reads the changed blocks and keeps the revoked ones', async () => {
      const response: BlockSyncResponse = { blocks: [], revoked: ['block-9'] };
      const harness = buildHarness({ syncResult: Result.ok(response) });

      const reply = await replyOf(harness.service, CHANGED_SYNC_REQUEST);

      expect(harness.syncedFor[0]?.request).toEqual({ blocks: [{ id: 'block-1', version: 2 }], kind: 'changed' });
      expect(reply).toEqual({ blocks: [], requestId: 'request-3', revoked: ['block-9'], type: 'syncResult' });
    });

    it('answers a failure with the same code the HTTP endpoint would raise', async () => {
      const harness = buildHarness({ syncResult: Result.fail(new BlockAccessDeniedError()) });

      const reply = await replyOf(harness.service, PAGE_SYNC_REQUEST);

      expect(reply).toEqual({ code: 'BLOCK_ACCESS_DENIED', requestId: 'request-2', type: 'error' });
    });
  });

  it('asks for the socket to be closed when the account is inactive or gone, for either kind of request', async () => {
    const harness = buildHarness({ role: null });

    expect(await harness.service.answer(TOKEN_READER, TRANSACTIONS_REQUEST)).toEqual({ kind: 'inactive' });
    expect(await harness.service.answer(TOKEN_READER, PAGE_SYNC_REQUEST)).toEqual({ kind: 'inactive' });
    expect(harness.appliedFor).toEqual([]);
    expect(harness.syncedFor).toEqual([]);
  });
});
