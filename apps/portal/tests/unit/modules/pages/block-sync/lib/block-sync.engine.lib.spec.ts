import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { blocksToDocument, type PageContent } from '@neuma/shared';
import { TextSelection } from 'prosemirror-state';
import {
  BLOCK_SYNC_COALESCE_INTERVAL_MS,
  BLOCK_SYNC_PRESENCE_THROTTLE_MS,
} from '@/modules/pages/block-sync/constants/block-sync.constants';
import { createBlockSyncEngine } from '@/modules/pages/block-sync/lib/block-sync.engine.lib';
import { contentToEditorDocument } from '@/modules/pages/block-sync/lib/block-sync.remote.lib';
import type { BlockSyncEngine } from '@/modules/pages/block-sync/types/block-sync.types';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';
import type { PagesAutosaveDisplayState } from '@/modules/pages/types/pages.autosave.types';
import type { PageCollaborationParticipant } from '@/modules/pages/types/pages.collaboration.types';
import { FakeBlockServer, FakeSession } from '../block-sync.fake-server';
import { documentOf, heading, paragraph, text, unwrap } from '../block-sync.fixtures';
import type { EngineClient } from '../block-sync.test.types';

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
};

const settle = async (): Promise<void> => {
  jest.advanceTimersByTime(BLOCK_SYNC_COALESCE_INTERVAL_MS);
  await flush();
};

const createClient = (server: FakeBlockServer, initial: PageContent, userId = 'user-1'): EngineClient => {
  let idCounter = 0;
  const participants: (readonly PageCollaborationParticipant[])[] = [];
  const replaced: PageContent[] = [];
  const saveStates: PagesAutosaveDisplayState[] = [];
  const readOnlyCalls: number[] = [];
  let session: FakeSession | null = null;
  const client: { content: PageContent; engine: BlockSyncEngine | null } = { content: initial, engine: null };
  const engine = createBlockSyncEngine({
    bridge: {
      readContent: () => client.content,
      replaceContent: (content) => {
        client.content = content;
        replaced.push(content);
        client.engine?.notifyContentChange(content);
      },
    },
    callbacks: {
      onParticipantsChange: (next) => participants.push(next),
      onReadOnly: () => readOnlyCalls.push(1),
      onSaveStateChange: (state) => saveStates.push(state),
      onStatusChange: () => undefined,
    },
    createId: () => {
      idCounter += 1;
      return `${userId}-tx-${String(idCounter)}`;
    },
    createSession: (handlers) => {
      session = new FakeSession(server, handlers);
      return session;
    },
    initialBlocks: server.readBlocks(),
    localUserId: userId,
    pageId: 'page-1',
    resolveParticipant: (id) => ({ color: null, name: `Name of ${id}` }),
    spaceId: 'space-1',
  });
  client.engine = engine;
  if (session === null) throw new Error('The engine opened no session');
  const openedSession: FakeSession = session;
  return {
    get content() {
      return client.content;
    },
    edit: (content) => {
      client.content = content;
      engine.notifyContentChange(content);
    },
    engine,
    participants,
    readOnlyCalls,
    replaced,
    saveStates,
    session: openedSession,
  };
};

const serverContent = (server: FakeBlockServer): PageContent => {
  const synced = server.syncPage().blocks;
  const page = synced.find((block) => block.id === 'page-1');
  if (page === undefined) throw new Error('No page');
  return unwrap(
    blocksToDocument(
      page,
      synced.filter((block) => block.id !== 'page-1'),
    ),
  );
};

const two = documentOf(paragraph('p1', text('Hello')), paragraph('p2', text('World')));

describe('createBlockSyncEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sends typing as one transaction with only the text update', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    const before = client.session.requests.length;

    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();

    const sent = client.session.requests.slice(before).filter((request) => request.type === 'transactions');
    expect(sent).toHaveLength(1);
    const operations = sent[0]?.type === 'transactions' ? sent[0].transactions[0]?.operations : [];
    expect(operations?.map((operation) => operation.command)).toEqual(['applyText']);
    expect(server.readText('p1', 'title')).toBe('Hello!');
  });

  it('sends many keystrokes within the interval as one transaction', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    for (const typed of ['Hello a', 'Hello ab', 'Hello abc']) {
      client.edit(documentOf(paragraph('p1', text(typed)), paragraph('p2', text('World'))));
      jest.advanceTimersByTime(BLOCK_SYNC_COALESCE_INTERVAL_MS / 4);
    }
    await settle();

    expect(server.receivedTransactionIds).toHaveLength(1);
    expect(server.readText('p1', 'title')).toBe('Hello abc');
  });

  it('keeps the server and the editor the same after structural edits', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    const edited = documentOf(paragraph('p1', text('Hello')), heading('h1', 2, 'New'), paragraph('p2', text('World')));
    client.edit(edited);
    await settle();
    client.edit(documentOf(heading('h1', 2, 'New'), paragraph('p2', text('World'))));
    await settle();

    expect(serverContent(server)).toEqual(client.content);
  });

  it('does not send anything for a change it applied from someone else', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    const version = server.editTextAsSomeoneElse('p2', 'title', (insert) => insert(5, '!'));

    client.session.handlers.onVersions([version]);
    await flush();
    await settle();

    expect(client.replaced).toHaveLength(1);
    expect(server.receivedTransactionIds).toHaveLength(0);
    expect(JSON.stringify(client.content)).toContain('World!');
  });

  it('does not ask for a block again after it sent the change itself', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();
    const requestsBefore = server.syncRequests.length;

    client.session.handlers.onVersions(server.versions().filter((entry) => entry.id === 'p1'));
    await flush();

    expect(server.syncRequests.length).toBe(requestsBefore);
  });

  it('converges when two people type in the same paragraph', async () => {
    const server = new FakeBlockServer(two);
    const first = createClient(server, two, 'user-1');
    const second = createClient(server, two, 'user-2');
    first.session.connect();
    second.session.connect();
    await flush();

    first.edit(documentOf(paragraph('p1', text('Oh Hello')), paragraph('p2', text('World'))));
    second.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();
    first.session.handlers.onVersions(server.versions());
    second.session.handlers.onVersions(server.versions());
    await flush();
    await settle();

    expect(first.content).toEqual(second.content);
    expect(server.readText('p1', 'title')).toBe('Oh Hello!');
    expect(serverContent(server)).toEqual(first.content);
  });

  it('applies a remote change to other blocks while a local edit is waiting', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.edit(documentOf(paragraph('p1', text('Hello local')), paragraph('p2', text('World'))));
    const version = server.editTextAsSomeoneElse('p2', 'title', (insert) => insert(5, '?'));

    client.session.handlers.onVersions([version]);
    await flush();
    await settle();

    expect(JSON.stringify(client.content)).toContain('Hello local');
    expect(JSON.stringify(client.content)).toContain('World?');
    expect(server.readText('p1', 'title')).toBe('Hello local');
  });

  it('syncs the page and sends the typed text again when the server says the text is out of sync', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    server.failNextTransaction('BLOCK_TEXT_OUT_OF_SYNC');
    const pageSyncsBefore = server.syncRequests.filter((entry) => entry === 'page').length;

    client.edit(documentOf(paragraph('p1', text('Hello typed')), paragraph('p2', text('World'))));
    await settle();
    await flush();

    expect(server.syncRequests.filter((entry) => entry === 'page').length).toBeGreaterThan(pageSyncsBefore);
    expect(server.readText('p1', 'title')).toBe('Hello typed');
    expect(JSON.stringify(client.content)).toContain('Hello typed');
  });

  it('keeps what was typed and what someone else wrote when it has to rebase', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    server.failNextTransaction('BLOCK_TREE_INVALID');
    server.editTextAsSomeoneElse('p2', 'title', (insert) => insert(5, '?'));

    client.edit(documentOf(paragraph('p1', text('Hello typed')), paragraph('p2', text('World'))));
    await settle();
    await flush();
    await settle();

    expect(server.readText('p1', 'title')).toBe('Hello typed');
    expect(server.readText('p2', 'title')).toBe('World?');
    expect(JSON.stringify(client.content)).toContain('World?');
    expect(serverContent(server)).toEqual(client.content);
  });

  it('sends the same transaction again, with the same id, after the network failed', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.session.requestFailure = 'timeout';

    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(server.receivedTransactionIds).toHaveLength(1);
    expect(server.readText('p1', 'title')).toBe('Hello!');
    const transactionRequests = client.session.requests.filter((request) => request.type === 'transactions');
    const ids = transactionRequests.map((request) =>
      request.type === 'transactions' ? request.transactions[0]?.id : '',
    );
    expect(new Set(ids).size).toBe(1);
    expect(ids).toHaveLength(2);
  });

  it('sends what is pending and syncs the page again once the connection returns', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.session.disconnect();

    client.edit(documentOf(paragraph('p1', text('Hello offline')), paragraph('p2', text('World'))));
    await settle();
    expect(server.readText('p1', 'title')).toBe('Hello');
    const pageSyncsBefore = server.syncRequests.filter((entry) => entry === 'page').length;

    client.session.connect();
    await flush();
    await settle();

    expect(server.readText('p1', 'title')).toBe('Hello offline');
    expect(server.syncRequests.filter((entry) => entry === 'page').length).toBeGreaterThan(pageSyncsBefore);
  });

  it('goes read-only when the page is revoked and stops sending', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.session.handlers.onRevoked();
    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();

    expect(client.readOnlyCalls).toHaveLength(1);
    expect(server.receivedTransactionIds).toHaveLength(0);
  });

  it('shows pending, saving and saved while a change travels', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();

    expect(client.saveStates).toEqual(['pending', 'saving', 'saved']);
  });

  it('reports offline while a change cannot travel', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.session.disconnect();

    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();

    expect(client.saveStates.at(-1)).toBe('offline');
  });

  it('resolves flush once everything was sent', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();
    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));

    const flushed = client.engine.flush();
    jest.advanceTimersByTime(BLOCK_SYNC_COALESCE_INTERVAL_MS);
    await flush();

    expect(await flushed).toBe(true);
    expect(server.readText('p1', 'title')).toBe('Hello!');
  });

  it('sends the cursor block at most once per throttle window, the latest one', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.engine.reportCursor('p1');
    client.engine.reportCursor('p2');
    client.engine.reportCursor('p3');
    expect(client.session.presenceSent).toEqual(['p1']);
    jest.advanceTimersByTime(BLOCK_SYNC_PRESENCE_THROTTLE_MS);

    expect(client.session.presenceSent).toEqual(['p1', 'p3']);
  });

  it('does not resend the block the cursor is already known to be in', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.engine.reportCursor('p1');
    jest.advanceTimersByTime(BLOCK_SYNC_PRESENCE_THROTTLE_MS);
    client.engine.reportCursor('p1');

    expect(client.session.presenceSent).toEqual(['p1']);
  });

  it('tells the block the selection is in', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.engine.reportSelection(TextSelection.create(contentToEditorDocument(two), 2));

    expect(client.session.presenceSent).toEqual(['p1']);
  });

  it('shows the other people who are on the page', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.session.handlers.onPresence([{ blockId: 'p2', expiresAt: 1, userId: 'user-9' }]);

    expect(client.participants.at(-1)?.[0]).toMatchObject({ cursor: { blockId: 'p2' }, name: 'Name of user-9' });
  });

  it('stops everything when destroyed', async () => {
    const server = new FakeBlockServer(two);
    const client = createClient(server, two);
    client.session.connect();
    await flush();

    client.engine.destroy();
    client.edit(documentOf(paragraph('p1', text('Hello!')), paragraph('p2', text('World'))));
    await settle();

    expect(client.session.isDestroyed).toBe(true);
    expect(server.receivedTransactionIds).toHaveLength(0);
  });
});
