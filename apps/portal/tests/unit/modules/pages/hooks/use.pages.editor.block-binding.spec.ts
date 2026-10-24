import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

interface CapturedCallbacks {
  readonly onReadOnly: () => void;
}

let captured: CapturedCallbacks | null = null;

mock.module('@/config/env.config', () => ({ env: { NEXT_PUBLIC_LIVE_WS_URL: 'ws://localhost/live' } }));
mock.module('@/modules/pages/block-sync/lib/block-sync.browser-outbox.lib', () => ({
  openBrowserBlockSyncOutbox: () => undefined,
}));
mock.module('@/modules/pages/block-sync/lib/block-sync.session.lib', () => ({ createBlockLiveSession: () => null }));
mock.module('@/modules/pages/block-sync/lib/block-sync.socket.lib', () => ({ openBrowserBlockLiveSocket: () => null }));
mock.module('@/modules/pages/block-sync/lib/block-sync.token.lib', () => ({ requestBlockLiveToken: async () => null }));
mock.module('@/modules/pages/block-sync/lib/block-sync.engine.lib', () => ({
  createBlockSyncEngine: (options: { readonly callbacks: CapturedCallbacks }) => {
    captured = options.callbacks;
    return { destroy: () => undefined, flush: async () => true };
  },
}));

const { usePagesEditorBlockBinding } = await import('@/modules/pages/editor/hooks/use.pages.editor.block-binding');

const buildOptions = (isEnabled: boolean) => ({
  fallbackSaveState: 'idle' as const,
  initialBlocks: [],
  isEnabled,
  localUserId: 'user-1',
  pageId: 'page-1',
  personOptions: [],
  readContent: () => ({ content: [], schemaVersion: 1 as const, type: 'doc' as const }),
  replaceContent: () => undefined,
  spaceId: 'space-1',
});

describe('usePagesEditorBlockBinding write permission', () => {
  it('stops writing when the channel says the page is read-only, and writes again once the viewer may edit again', () => {
    const { result, rerender } = renderHook(({ isEnabled }) => usePagesEditorBlockBinding(buildOptions(isEnabled)), {
      initialProps: { isEnabled: true },
    });
    expect(result.current.canWrite).toBe(true);

    act(() => captured?.onReadOnly());
    expect(result.current.canWrite).toBe(false);

    rerender({ isEnabled: false });
    rerender({ isEnabled: true });

    expect(result.current.canWrite).toBe(true);
  });
});
