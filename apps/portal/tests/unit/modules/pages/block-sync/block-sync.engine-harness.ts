import { jest } from 'bun:test';
import { blocksToDocument, type PageContent } from '@neuma/shared';
import { BLOCK_SYNC_COALESCE_INTERVAL_MS } from '@/modules/pages/block-sync/constants/block-sync.constants';
import { createBlockSyncEngine } from '@/modules/pages/block-sync/lib/block-sync.engine.lib';
import type { BlockSyncEngine } from '@/modules/pages/block-sync/types/block-sync.types';
import type { PagesAutosaveDisplayState } from '@/modules/pages/types/pages.autosave.types';
import type { PageCollaborationParticipant } from '@/modules/pages/types/pages.collaboration.types';
import { type FakeBlockServer, FakeSession } from './block-sync.fake-server';
import { unwrap } from './block-sync.fixtures';
import type { EngineClient } from './block-sync.test.types';

export const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
};

/** Lets the time a keystroke waits go by, and the requests it started finish. */
export const settle = async (): Promise<void> => {
  jest.advanceTimersByTime(BLOCK_SYNC_COALESCE_INTERVAL_MS);
  await flush();
};

/** An engine for the page, wired to the fake server, with the editor played by a variable. */
export const createClient = (
  server: FakeBlockServer,
  initial: PageContent,
  userId = 'user-1',
  isViewer = false,
): EngineClient => {
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
    isViewer,
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

/** The page document the server holds now. */
export const serverContent = (server: FakeBlockServer): PageContent => {
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

/** What the server announces to the other clients after a change. */
export const announceToOthers = async (server: FakeBlockServer, others: readonly EngineClient[]): Promise<void> => {
  for (const other of others) other.session.handlers.onVersions(server.versions());
  await flush();
  await settle();
};
