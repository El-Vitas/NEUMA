import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import { BlocksService } from '@/modules/blocks/blocks.service';
import {
  BLOCK_SUBTREE_MAX_BLOCKS,
  BLOCK_SYNC_MAX_ROWS,
  BLOCK_SYNC_MAX_TEXT_STATE_BYTES,
} from '@/modules/blocks/constants/blocks.constants';
import type { BlockRecord, BlockRows } from '@/modules/blocks/domain/block.domain.types';
import {
  BlockAccessDeniedError,
  BlockSubtreeTooLargeError,
  BlockSyncTextTooLargeError,
  BlockTreeTooDeepError,
} from '@/modules/blocks/domain/block.error';
import type { BlockReader, BlockRepositoryContract } from '@/modules/blocks/types/blocks.types';

const SPACE_ID = 'space-1';
const PAGE_ID = 'page-1';

const reader: BlockReader = { role: USER_ROLE.WORKER, userId: 'user-1', workspaceId: 'workspace-1' };

const buildRecord = (id: string, parentId: string | null): BlockRecord => ({
  alive: true,
  children: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdById: 'author',
  editedAt: new Date('2026-01-01T00:00:00.000Z'),
  editedById: 'author',
  format: null,
  id,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  parentId,
  permissions: null,
  properties: {},
  spaceId: SPACE_ID,
  text: '',
  type: 'paragraph',
  version: 1,
});

const stateReads: (readonly string[])[] = [];

const buildService = (
  rows: BlockRows,
  readableSpaceIds: readonly string[],
  isDepthExceeded = false,
  textStates: ReadonlyMap<string, Uint8Array> = new Map(),
): BlocksService => {
  stateReads.length = 0;
  const textStateBytes = new Map([...textStates].map(([id, state]) => [id, state.byteLength]));
  const result = { ...rows, isDepthExceeded, textStateBytes };
  const repository: BlockRepositoryContract = {
    findReadableSpaceIds: () => Promise.resolve(new Set(readableSpaceIds)),
    findReadableSpaceIdsByReader: (_spaceIds, readers) =>
      Promise.resolve(new Map(readers.map((candidate) => [candidate.userId, new Set(readableSpaceIds)]))),
    readChanged: () => Promise.resolve(result),
    readSubtree: () => Promise.resolve(result),
    readTextStates: (blockIds) => {
      stateReads.push(blockIds);
      return Promise.resolve(new Map([...textStates].filter(([id]) => blockIds.includes(id))));
    },
  };
  return new BlocksService(repository);
};

describe('BlocksService', () => {
  it('fails instead of silently dropping blocks nested past the depth limit', async () => {
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, [SPACE_ID], true);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockTreeTooDeepError);
  });

  it('does not reveal the depth of a page the viewer cannot read', async () => {
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, [], true);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockAccessDeniedError);
  });

  it('fails a catch-up whose ancestor chain passed the depth limit', async () => {
    const service = buildService({ context: [], targets: [buildRecord('changed', null)] }, [SPACE_ID], true);

    const result = await service.sync({ blocks: [{ id: 'changed', version: 0 }], kind: 'changed' }, reader);

    expect(result.getError()).toBeInstanceOf(BlockTreeTooDeepError);
  });

  it('lists in revoked the requested ids that are gone or unreadable, and none for a page read', async () => {
    const service = buildService({ context: [], targets: [buildRecord('changed', null)] }, [SPACE_ID]);

    const catchUp = await service.sync(
      {
        blocks: [
          { id: 'changed', version: 0 },
          { id: 'gone', version: 3 },
        ],
        kind: 'changed',
      },
      reader,
    );
    const page = await service.sync({ kind: 'page', pageId: 'changed' }, reader);

    expect(catchUp.getValue().revoked).toEqual(['gone']);
    expect(page.getValue()).not.toHaveProperty('revoked');
  });

  it('returns the visible blocks of a page the viewer can read', async () => {
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, [SPACE_ID]);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getValue().blocks.map((block) => block.id)).toEqual([PAGE_ID]);
  });

  it('refuses a page whose space the viewer cannot read, as a missing page would be', async () => {
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, []);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockAccessDeniedError);
  });

  it('refuses a page that does not exist', async () => {
    const service = buildService({ context: [], targets: [] }, [SPACE_ID]);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockAccessDeniedError);
  });

  it('fails instead of truncating a subtree over the limit', async () => {
    const children = Array.from({ length: BLOCK_SUBTREE_MAX_BLOCKS }, (_, index) =>
      buildRecord(`child-${String(index)}`, PAGE_ID),
    );
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null), ...children] }, [SPACE_ID]);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockSubtreeTooLargeError);
  });

  it('does not reveal the size of a subtree the viewer cannot read', async () => {
    const children = Array.from({ length: BLOCK_SUBTREE_MAX_BLOCKS }, (_, index) =>
      buildRecord(`child-${String(index)}`, PAGE_ID),
    );
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null), ...children] }, []);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockAccessDeniedError);
  });

  it('hands out the text state as base64 in a page read, and null for a block without one', async () => {
    const states = new Map([[PAGE_ID, new Uint8Array([1, 2, 3])]]);
    const service = buildService(
      { context: [], targets: [buildRecord(PAGE_ID, null), buildRecord('plain', PAGE_ID)] },
      [SPACE_ID],
      false,
      states,
    );

    const blocks = (await service.sync({ kind: 'page', pageId: PAGE_ID }, reader)).getValue().blocks;

    expect(blocks.find((block) => block.id === PAGE_ID)?.textState).toBe('AQID');
    expect(blocks.find((block) => block.id === 'plain')?.textState).toBeNull();
  });

  it('hands out the text state in a catch-up read too, but not for a block the viewer cannot read', async () => {
    const states = new Map([['changed', new Uint8Array([9])]]);
    const readable = buildService({ context: [], targets: [buildRecord('changed', null)] }, [SPACE_ID], false, states);
    const closed = buildService({ context: [], targets: [buildRecord('changed', null)] }, [], false, states);

    const request = { blocks: [{ id: 'changed', version: 0 }], kind: 'changed' } as const;

    expect((await readable.sync(request, reader)).getValue().blocks[0]?.textState).toBe('CQ==');
    expect((await closed.sync(request, reader)).getValue().blocks).toEqual([]);
  });

  it('fails with a typed error when the readable text states together pass the byte cap', async () => {
    const states = new Map([[PAGE_ID, new Uint8Array(BLOCK_SYNC_MAX_TEXT_STATE_BYTES + 1)]]);
    const service = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, [SPACE_ID], false, states);

    const result = await service.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(result.getError()).toBeInstanceOf(BlockSyncTextTooLargeError);
    expect(stateReads).toEqual([]);
  });

  it('asks for the text states of the blocks that have one, and for none when no block does', async () => {
    const withState = buildService(
      { context: [], targets: [buildRecord(PAGE_ID, null), buildRecord('plain', PAGE_ID)] },
      [SPACE_ID],
      false,
      new Map([[PAGE_ID, new Uint8Array([1])]]),
    );
    await withState.sync({ kind: 'page', pageId: PAGE_ID }, reader);
    const readsWithState = [...stateReads];
    const withoutState = buildService({ context: [], targets: [buildRecord(PAGE_ID, null)] }, [SPACE_ID]);
    await withoutState.sync({ kind: 'page', pageId: PAGE_ID }, reader);

    expect(readsWithState).toEqual([[PAGE_ID]]);
    expect(stateReads).toEqual([]);
  });

  it('refuses a catch-up whose rows pass the cap instead of reading them all', async () => {
    const rows = Array.from({ length: BLOCK_SYNC_MAX_ROWS + 1 }, (_, index) =>
      buildRecord(`context-${String(index)}`, 'changed'),
    );
    const service = buildService({ context: rows, targets: [buildRecord('changed', null)] }, [SPACE_ID]);

    const result = await service.sync({ blocks: [{ id: 'changed', version: 0 }], kind: 'changed' }, reader);

    expect(result.getError()).toBeInstanceOf(BlockSubtreeTooLargeError);
    expect(stateReads).toEqual([]);
  });

  it('returns the changed blocks of a catch-up read', async () => {
    const service = buildService({ context: [], targets: [buildRecord('changed', null)] }, [SPACE_ID]);

    const result = await service.sync({ blocks: [{ id: 'changed', version: 0 }], kind: 'changed' }, reader);

    expect(result.getValue().blocks.map((block) => block.id)).toEqual(['changed']);
  });
});
