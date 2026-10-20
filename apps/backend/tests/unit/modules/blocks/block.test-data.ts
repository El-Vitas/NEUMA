import { USER_ROLE } from '@neuma/shared';
import type {
  BlockOperation,
  BlockTransactionInput,
  WorkingBlock,
} from '@/modules/blocks/domain/block.transaction.domain.types';

export const SPACE_ID = 'space-1';
export const USER_ID = 'user-1';
export const NOW = new Date('2026-10-19T12:00:00.000Z');
export const MAX_TREE_DEPTH = 8;

export const buildBlock = (overrides: Partial<WorkingBlock> & Pick<WorkingBlock, 'id'>): WorkingBlock => ({
  alive: true,
  children: [],
  createdAt: NOW,
  createdById: USER_ID,
  editedAt: NOW,
  editedById: USER_ID,
  format: null,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  parentId: null,
  permissions: null,
  properties: { title: [] },
  spaceId: SPACE_ID,
  text: '',
  textState: null,
  type: 'paragraph',
  version: 1,
  ...overrides,
});

export const buildPage = (overrides: Partial<WorkingBlock> & Pick<WorkingBlock, 'id'>): WorkingBlock =>
  buildBlock({ properties: { title: [] }, type: 'page', ...overrides });

export const buildInput = (
  operations: readonly BlockOperation[],
  locked: readonly WorkingBlock[],
  overrides: Partial<BlockTransactionInput> = {},
): BlockTransactionInput => ({
  actor: { userId: USER_ID, workspaceRole: USER_ROLE.WORKER },
  extraReadableSpaceIds: [],
  isSpaceReadable: true,
  load: { context: [], isDepthExceeded: false, locked, spaces: [{ id: SPACE_ID, rootPageIds: [] }] },
  maxTreeDepth: MAX_TREE_DEPTH,
  now: NOW,
  operations,
  spaceId: SPACE_ID,
  ...overrides,
});

export const createParagraph = (blockId: string, parentId: string): BlockOperation => ({
  blockId,
  command: 'create',
  fields: { format: null, parentId, properties: { title: [{ insert: 'Hello' }] }, type: 'paragraph' },
});

export const listAfter = (blockId: string, childId: string, anchorId: string | null = null): BlockOperation => ({
  blockId,
  childId,
  command: 'insertChild',
  placement: { anchorId, side: 'after' },
});
