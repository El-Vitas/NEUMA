import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import { readPagePropertyConfig, USER_ROLE } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { planBlockTransaction } from '@/modules/blocks/domain/block.transaction.domain';
import type { StoredView, ViewOperationEntry } from '@/modules/blocks/domain/block.transaction.domain.types';
import { blockTextEngine } from '@/modules/blocks/utils/block.text.utils';
import { buildInput, buildPage, USER_ID } from '../block.test-data';

const collection = buildPage({ children: ['r1', 'r2', 'r3'], id: 'collection-1' });

const statusProperty: SchemaPropertyDefinition = {
  config: readPagePropertyConfig(null),
  key: 'status',
  label: 'Status',
  options: [{ color: 'GRAY', group: 'TO_DO', id: 'todo', value: 'To do' }],
  required: false,
  type: DatabasePropertyType.STATUS,
};

const view: StoredView = {
  collectionOrder: ['r1', 'r2', 'r3'],
  configuration: { groupBy: 'status' },
  id: 'view-1',
  manualOrder: null,
  name: 'Board',
  pageId: 'collection-1',
  type: DatabaseViewType.BOARD,
  version: 3,
};

const plan = (
  viewOperations: readonly ViewOperationEntry[],
  overrides: { readonly role?: keyof typeof USER_ROLE; readonly views?: readonly StoredView[] } = {},
) =>
  planBlockTransaction(
    buildInput([], [collection], {
      actor: { userId: USER_ID, workspaceRole: USER_ROLE[overrides.role ?? 'WORKER'] },
      viewOperations,
      viewSchemas: new Map([['collection-1', [statusProperty]]]),
      views: overrides.views ?? [view],
    }),
    blockTextEngine,
  );

const planned = (viewOperations: readonly ViewOperationEntry[]) => {
  const result = plan(viewOperations);
  if (result.isFail()) throw result.getError();
  return result.getValue();
};

describe('planning view operations', () => {
  it('materializes the manual order from the collection on the first placement and moves the row', () => {
    const result = planned([
      { operation: { after: 'r1', command: 'listAfter', id: 'r3', list: 'manualOrder' }, viewId: 'view-1' },
    ]);

    expect(result.viewWrites).toHaveLength(1);
    expect(result.viewWrites[0]?.manualOrder).toEqual(['r1', 'r3', 'r2']);
    expect(result.viewWrites[0]?.version).toBe(4);
    expect(result.viewVersions).toEqual([{ id: 'view-1', version: 4 }]);
  });

  it('counts one version per operation and applies them in order', () => {
    const result = planned([
      { operation: { command: 'setEntry', key: 'status', map: 'columnWidths', value: 200 }, viewId: 'view-1' },
      { operation: { command: 'setEntry', key: 'owner', map: 'columnWidths', value: 150 }, viewId: 'view-1' },
    ]);

    expect(result.viewWrites[0]?.version).toBe(5);
    expect(result.viewWrites[0]?.configuration.columnWidths).toEqual({ owner: 150, status: 200 });
  });

  it('keeps a manual order the view already has and leaves the configuration it did not touch', () => {
    const ordered: StoredView = { ...view, manualOrder: ['r3', 'r2', 'r1'] };

    const result = plan(
      [{ operation: { before: 'r3', command: 'listBefore', id: 'r1', list: 'manualOrder' }, viewId: 'view-1' }],
      { views: [ordered] },
    );

    expect(result.getValue().viewWrites[0]?.manualOrder).toEqual(['r1', 'r3', 'r2']);
    expect(result.getValue().viewWrites[0]?.configuration.groupBy).toBe('status');
  });

  it('refuses a view of a collection the viewer cannot edit', () => {
    const result = plan([{ operation: { command: 'set', key: 'frozenColumns', value: 1 }, viewId: 'view-1' }], {
      role: 'CLIENT',
    });

    expect(result.isFail()).toBe(true);
  });

  it('refuses a view that is not among the ones held, as if it did not exist', () => {
    const result = plan([{ operation: { command: 'set', key: 'frozenColumns', value: 1 }, viewId: 'ghost' }]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('BLOCK_ACCESS_DENIED');
  });

  it('refuses an operation that leaves a board without a property to group by', () => {
    const result = plan([{ operation: { command: 'set', key: 'groupBy', value: null }, viewId: 'view-1' }]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('BLOCK_OPERATION_INVALID');
  });

  it('refuses a value the key does not take, with the operation index', () => {
    const result = plan([{ operation: { command: 'set', key: 'frozenColumns', value: 'many' }, viewId: 'view-1' }]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('BLOCK_OPERATION_INVALID');
  });

  it('writes nothing for a transaction without view operations', () => {
    const result = planned([]);

    expect(result.viewWrites).toEqual([]);
    expect(result.viewVersions).toEqual([]);
  });
});
