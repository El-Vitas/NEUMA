import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '@/modules/pages/constants/pages.collaboration.constants';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';
import type {
  CollaborationStatus,
  PageCollaborationParticipant,
  PageCollaborationSession,
} from '@/modules/pages/types/pages.collaboration.types';
import type { PageContent } from '@/modules/pages/types/pages.types';

const providerConfigurations: MockHocuspocusProvider['configuration'][] = [];
const destroyCalls: string[] = [];
const attachCalls: MockHocuspocusProvider[] = [];
let setAwarenessFieldCallCount = 0;

class MockHocuspocusProviderWebsocket {
  destroy(): void {
    destroyCalls.push('websocket');
  }
}

class MockHocuspocusProvider {
  constructor(public readonly configuration: { readonly onStatus: (payload: { readonly status: string }) => void }) {
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

const samplePageContent: PageContent = {
  content: [{ content: [{ text: 'placeholder', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
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
    initialContent: samplePageContent,
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
});
