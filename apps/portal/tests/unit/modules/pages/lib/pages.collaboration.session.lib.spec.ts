import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { Doc } from 'yjs';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '@/modules/pages/constants/pages.collaboration.constants';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';
import type {
  CollaborationStatus,
  PageCollaborationParticipant,
  PageCollaborationSession,
} from '@/modules/pages/types/pages.collaboration.types';

const providerConfigurations: MockHocuspocusProvider['configuration'][] = [];
const destroyCalls: string[] = [];
const attachCalls: MockHocuspocusProvider[] = [];
let setAwarenessFieldCallCount = 0;

class MockHocuspocusProviderWebsocket {
  /** The socket is asked to connect by the session, so its refusal belongs to the session. */
  connect(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): void {
    destroyCalls.push('websocket');
  }
}

class MockHocuspocusProvider {
  constructor(
    public readonly configuration: {
      readonly document: Doc;
      readonly onStatus: (payload: { readonly status: string }) => void;
      readonly onSynced: (payload: { readonly state: boolean }) => void;
    },
  ) {
    providerConfigurations.push(configuration);
  }

  attach(): void {
    attachCalls.push(this);
  }

  destroy(): void {
    destroyCalls.push('provider');
  }

  setAwarenessField(): void {
    setAwarenessFieldCallCount += 1;
  }
}

mock.module('@hocuspocus/provider', () => ({
  HocuspocusProvider: MockHocuspocusProvider,
  HocuspocusProviderWebsocket: MockHocuspocusProviderWebsocket,
}));

mock.module('@/modules/pages/server/actions/pages.collaboration.actions', () => ({
  getPageCollaborationToken: () => Promise.resolve({ data: { token: 'test-token' } }),
}));

const { createPageCollaborationSession } = await import('@/modules/pages/lib/pages.collaboration.session.lib');

const emitStatus = (index: number, status: string): void => {
  providerConfigurations[index]?.onStatus({ status });
};

const createRecordingSession = (pageId: string) => {
  const statuses: CollaborationStatus[] = [];
  const sessions: (PageCollaborationSession | null)[] = [];
  const participants: (readonly PageCollaborationParticipant[])[] = [];

  const handle = createPageCollaborationSession({
    callbacks: {
      onParticipantsChange: (nextParticipants) => participants.push(nextParticipants),
      onSessionChange: (nextSession) => sessions.push(nextSession),
      onStatusChange: (nextStatus) => statuses.push(nextStatus),
    },
    getDisplayName: () => null,
    pageId,
  });

  return { handle, participants, sessions, statuses };
};

describe('pages.collaboration.session.lib', () => {
  beforeEach(() => {
    providerConfigurations.length = 0;
    destroyCalls.length = 0;
    attachCalls.length = 0;
    setAwarenessFieldCallCount = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('retries after a failure with the exact delay computed for that attempt number', async () => {
    const { handle } = createRecordingSession('page-retry');

    await Promise.resolve();
    expect(providerConfigurations.length).toBe(1);

    emitStatus(0, 'disconnected');
    await Promise.resolve();

    const firstDelay = computeCollaborationReconnectDelayMs(1);
    jest.advanceTimersByTime(firstDelay - 1);
    expect(providerConfigurations.length).toBe(1);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(providerConfigurations.length).toBe(2);

    emitStatus(1, 'disconnected');
    await Promise.resolve();

    const secondDelay = computeCollaborationReconnectDelayMs(2);
    jest.advanceTimersByTime(secondDelay - 1);
    expect(providerConfigurations.length).toBe(2);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(providerConfigurations.length).toBe(3);

    handle.destroy();
  });

  it('gives up after the maximum reconnect attempts and reports exhausted', async () => {
    const { handle, statuses } = createRecordingSession('page-exhausted');

    await Promise.resolve();

    for (let attempt = 0; attempt < MAX_COLLABORATION_RECONNECT_ATTEMPTS; attempt += 1) {
      emitStatus(providerConfigurations.length - 1, 'disconnected');
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    }

    expect(statuses.at(-1)).toBe('exhausted');
    const providerCountAtExhaustion = providerConfigurations.length;

    jest.runOnlyPendingTimers();
    await Promise.resolve();

    expect(providerConfigurations.length).toBe(providerCountAtExhaustion);

    handle.destroy();
  });

  it('resets the attempt count once a connection succeeds', async () => {
    const { handle } = createRecordingSession('page-reset');

    await Promise.resolve();
    expect(providerConfigurations.length).toBe(1);

    emitStatus(0, 'disconnected');
    await Promise.resolve();
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await Promise.resolve();
    expect(providerConfigurations.length).toBe(2);

    emitStatus(1, 'connected');
    await Promise.resolve();

    emitStatus(1, 'disconnected');
    await Promise.resolve();

    const baseDelay = computeCollaborationReconnectDelayMs(1);
    jest.advanceTimersByTime(baseDelay - 1);
    expect(providerConfigurations.length).toBe(2);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(providerConfigurations.length).toBe(3);

    handle.destroy();
  });

  it('does nothing after teardown: no further callbacks, providers, or reconnect timers', async () => {
    const { handle, statuses, sessions, participants } = createRecordingSession('page-teardown');

    await Promise.resolve();
    expect(providerConfigurations.length).toBe(1);
    expect(attachCalls.length).toBe(1);

    handle.destroy();

    expect(destroyCalls).toContain('provider');
    expect(destroyCalls).toContain('websocket');

    const statusCountAfterDestroy = statuses.length;
    const sessionCountAfterDestroy = sessions.length;
    const participantCountAfterDestroy = participants.length;
    const providerCountAfterDestroy = providerConfigurations.length;

    emitStatus(0, 'disconnected');
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    expect(statuses.length).toBe(statusCountAfterDestroy);
    expect(sessions.length).toBe(sessionCountAfterDestroy);
    expect(participants.length).toBe(participantCountAfterDestroy);
    expect(providerConfigurations.length).toBe(providerCountAfterDestroy);

    expect(() => handle.updateDisplayName()).not.toThrow();
    expect(setAwarenessFieldCallCount).toBe(0);
  });

  /**
   * What somebody writes while the connection is down lives only in their copy
   * of the page. Starting that copy over on reconnecting threw it away; keeping
   * it lets the reconnection hand it to the server.
   */
  it('keeps the same document across a reconnection, with what was written while cut off', async () => {
    const { handle, sessions } = createRecordingSession('page-keep');
    await Promise.resolve();
    const firstDocument = providerConfigurations[0]?.document;
    providerConfigurations[0]?.onSynced({ state: true });

    emitStatus(0, 'disconnected');
    await Promise.resolve();
    firstDocument?.getText('written-while-cut-off').insert(0, 'no se pierde');
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await Promise.resolve();

    expect(providerConfigurations[1]?.document).toBe(firstDocument);
    expect(providerConfigurations[1]?.document.getText('written-while-cut-off').toString()).toBe('no se pierde');
    expect(sessions.includes(null)).toBe(false);

    handle.destroy();
  });

  /** Only once it stops trying does the page stop being written live, and then it keeps itself by being sent. */
  it('lets go of the live session only when it gives up reconnecting', async () => {
    const { handle, sessions } = createRecordingSession('page-let-go');
    await Promise.resolve();
    providerConfigurations[0]?.onSynced({ state: true });

    for (let attempt = 0; attempt < MAX_COLLABORATION_RECONNECT_ATTEMPTS; attempt += 1) {
      expect(sessions.at(-1)).not.toBeNull();
      emitStatus(providerConfigurations.length - 1, 'disconnected');
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    }

    expect(sessions.at(-1)).toBeNull();

    handle.destroy();
  });

  /**
   * A failing connection is heard from more than once — the socket refuses and
   * the provider reports it — and each account of the same failure must not
   * become a reconnection of its own.
   */
  it('schedules one reconnection however many times the same failure is reported', async () => {
    const { handle, statuses } = createRecordingSession('page-once');

    await Promise.resolve();
    emitStatus(0, 'disconnected');
    emitStatus(0, 'disconnected');
    emitStatus(0, 'disconnected');
    await Promise.resolve();

    expect(statuses.filter((status) => status === 'reconnecting').length).toBe(1);

    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await Promise.resolve();

    expect(providerConfigurations.length).toBe(2);

    handle.destroy();
  });
});
