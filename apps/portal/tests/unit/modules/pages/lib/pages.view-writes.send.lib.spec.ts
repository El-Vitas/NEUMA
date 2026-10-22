import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PageViewWrite } from '@/modules/pages/collections/types/pages.view-writes.types';

const calls: { action: string; input: Record<string, unknown> }[] = [];
let answer: unknown = { data: null };

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  movePageRowAction: async (input: Record<string, unknown>) => {
    calls.push({ action: 'move', input });
    return answer;
  },
  updatePageRowPropertiesAction: async (input: Record<string, unknown>) => {
    calls.push({ action: 'cell', input });
    return answer;
  },
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async (input: Record<string, unknown>) => {
    calls.push({ action: 'create', input });
    return answer;
  },
}));

const { sendViewWrite } = await import('@/modules/pages/collections/lib/pages.view-writes.send.lib');

const cell: PageViewWrite = { kind: 'cell', pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' };

describe('sendViewWrite', () => {
  beforeEach(() => {
    calls.length = 0;
    answer = { data: null };
  });

  it('sends a cell to the action that writes cells, without the word that tells the writes apart', async () => {
    const sent = await sendViewWrite(cell);

    expect(sent).toEqual({ kind: 'applied' });
    expect(calls).toEqual([
      { action: 'cell', input: { pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' } },
    ]);
  });

  it('sends a move and a new row to their own actions', async () => {
    await sendViewWrite({
      kind: 'move',
      listChanges: {},
      pageId: 'collection-1',
      rowId: 'row-1',
      spaceId: 'space-1',
      values: {},
      viewId: 'view-1',
    });
    await sendViewWrite({
      content: { content: [], schemaVersion: 1, type: 'doc' },
      id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
      kind: 'create',
      parentId: 'collection-1',
      spaceId: 'space-1',
      title: 'New',
    });

    expect(calls.map((call) => call.action)).toEqual(['move', 'create']);
    expect(calls[1]?.input.id).toBe('0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00');
  });

  it('says the network did not carry it when the call never reached the server', async () => {
    answer = { serverError: 'offline' };

    expect(await sendViewWrite(cell)).toEqual({ kind: 'offline' });
  });

  it('keeps trying when the server asks to slow down', async () => {
    answer = { serverError: 'rateLimited' };

    expect(await sendViewWrite(cell)).toEqual({ kind: 'offline' });
  });

  it('says why a write was refused, in the causes the person is shown', async () => {
    answer = { serverError: 'forbidden' };
    expect(await sendViewWrite(cell)).toMatchObject({ cause: 'forbidden', kind: 'rejected' });

    answer = { serverError: 'missing' };
    expect(await sendViewWrite(cell)).toMatchObject({ cause: 'missing', kind: 'rejected' });

    answer = { serverError: 'invalid' };
    expect(await sendViewWrite(cell)).toMatchObject({ cause: 'invalid', kind: 'rejected' });

    answer = { serverError: 'locked' };
    expect(await sendViewWrite(cell)).toMatchObject({ cause: 'other', kind: 'rejected' });
  });
});
