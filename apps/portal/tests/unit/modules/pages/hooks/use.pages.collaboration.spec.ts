import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '@/modules/pages/constants/pages.collaboration.constants';

type MockStatusHandler = (payload: { readonly status: string }) => void;

interface MockProviderConfiguration {
  readonly onStatus: MockStatusHandler;
}

interface AwarenessFieldCall {
  readonly instance: MockHocuspocusProvider;
  readonly key: string;
  readonly value: unknown;
}

const providerConfigurations: MockProviderConfiguration[] = [];
const destroyCalls: string[] = [];
const awarenessFieldCalls: AwarenessFieldCall[] = [];
const attachCalls: MockHocuspocusProvider[] = [];

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
  public awareness = null;

  constructor(public readonly configuration: MockProviderConfiguration) {
    providerConfigurations.push(configuration);
  }

  attach(): void {
    attachCalls.push(this);
  }

  destroy(): void {
    destroyCalls.push('provider');
  }

  setAwarenessField(key: string, value: unknown): void {
    awarenessFieldCalls.push({ instance: this, key, value });
  }
}

mock.module('@hocuspocus/provider', () => ({
  HocuspocusProvider: MockHocuspocusProvider,
  HocuspocusProviderWebsocket: MockHocuspocusProviderWebsocket,
}));

mock.module('@/modules/pages/server/actions/pages.collaboration.actions', () => ({
  getPageCollaborationToken: () => Promise.resolve({ data: { token: 'test-token' } }),
}));

const { usePagesCollaboration } = await import('@/modules/pages/hooks/use.pages.collaboration');

const emitStatus = (index: number, status: string): void => {
  providerConfigurations[index]?.onStatus({ status });
};

describe('usePagesCollaboration reconnect policy', () => {
  beforeEach(() => {
    providerConfigurations.length = 0;
    destroyCalls.length = 0;
    awarenessFieldCalls.length = 0;
    attachCalls.length = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('attaches every provider it creates so the caller-owned websocket delivers status and sync events', async () => {
    const { unmount } = renderHook(() => usePagesCollaboration('page-0', true));

    await waitFor(() => expect(providerConfigurations.length).toBe(1));
    await waitFor(() => expect(attachCalls.length).toBe(1));

    act(() => {
      emitStatus(0, 'disconnected');
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await waitFor(() => expect(attachCalls.length).toBe(providerConfigurations.length));

    unmount();
  });

  it('reaches the exhausted terminal state after the reconnect attempt cap and stops creating new providers', async () => {
    const { result, unmount } = renderHook(() => usePagesCollaboration('page-1', true));

    await waitFor(() => expect(providerConfigurations.length).toBe(1));

    for (let attempt = 0; attempt < MAX_COLLABORATION_RECONNECT_ATTEMPTS; attempt += 1) {
      act(() => {
        emitStatus(providerConfigurations.length - 1, 'disconnected');
      });
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => expect(result.current.status).toBe('exhausted'));
    const providerCountAtExhaustion = providerConfigurations.length;

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(providerConfigurations.length).toBe(providerCountAtExhaustion);
    expect(result.current.session).toBeNull();
    expect(result.current.participants).toEqual([]);

    unmount();
  });

  it('recovers to connected without exhausting when a reconnect attempt succeeds', async () => {
    const { result, unmount } = renderHook(() => usePagesCollaboration('page-2', true));

    await waitFor(() => expect(providerConfigurations.length).toBe(1));

    act(() => {
      emitStatus(0, 'connected');
    });

    await waitFor(() => expect(result.current.status).toBe('connected'));

    unmount();
  });

  it('destroys the provider and websocket on unmount without leaking pending reconnect timers', async () => {
    const { unmount } = renderHook(() => usePagesCollaboration('page-3', true));

    await waitFor(() => expect(providerConfigurations.length).toBe(1));

    act(() => {
      emitStatus(0, 'disconnected');
    });

    unmount();

    expect(destroyCalls).toContain('provider');
    expect(destroyCalls).toContain('websocket');

    const providerCountAfterUnmount = providerConfigurations.length;
    jest.runOnlyPendingTimers();
    expect(providerConfigurations.length).toBe(providerCountAfterUnmount);
  });

  it('updates the live awareness field on display name changes without rebuilding the session', async () => {
    const { rerender, unmount } = renderHook(
      ({ displayName }: { readonly displayName: string | null }) => usePagesCollaboration('page-4', true, displayName),
      { initialProps: { displayName: 'Alice' } },
    );

    await waitFor(() => expect(providerConfigurations.length).toBe(1));
    const providerCountAfterConnect = providerConfigurations.length;

    rerender({ displayName: 'Bob' });

    expect(providerConfigurations.length).toBe(providerCountAfterConnect);
    expect(destroyCalls).toEqual([]);
    expect(awarenessFieldCalls.at(-1)).toMatchObject({ key: 'user', value: { name: 'Bob' } });

    unmount();
  });
});
