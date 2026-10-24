import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { announceToOthers, createClient, flush, settle } from '../block-sync.engine-harness';
import { FakeBlockServer } from '../block-sync.fake-server';
import { documentOf, paragraph, text } from '../block-sync.fixtures';

const first = paragraph('p1', text('Hello'));
const second = paragraph('p2', text('World'));
const added = paragraph('p3', text('Added by the writer'));

const base = documentOf(first, second);
const withAdded = documentOf(first, second, added);

describe('a person who can only read the page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sees what a writer changes without reloading', async () => {
    const server = new FakeBlockServer(base);
    const writer = createClient(server, base, 'user-1');
    const viewer = createClient(server, base, 'user-2', true);
    writer.session.connect();
    viewer.session.connect();
    await flush();

    writer.edit(withAdded);
    await settle();
    await announceToOthers(server, [viewer]);

    expect(viewer.content).toEqual(writer.content);
  });

  it('never sends a transaction, even when the editor reports a change', async () => {
    const server = new FakeBlockServer(base);
    const viewer = createClient(server, base, 'user-2', true);
    viewer.session.connect();
    await flush();

    viewer.edit(withAdded);
    await settle();

    expect(server.receivedTransactions.length).toBe(0);
  });

  it('never reports where the cursor is', async () => {
    const server = new FakeBlockServer(base);
    const viewer = createClient(server, base, 'user-2', true);
    viewer.session.connect();
    await flush();

    viewer.engine.reportCursor('p1');
    jest.advanceTimersByTime(1000);

    expect(viewer.session.presenceSent).toEqual([]);
  });
});
