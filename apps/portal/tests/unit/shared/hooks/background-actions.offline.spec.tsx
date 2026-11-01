import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, render, renderHook } from '@testing-library/react';

const rejectAsOffline = async (): Promise<never> => {
  throw new TypeError('Failed to fetch');
};
const recordPageViewAction = mock(rejectAsOffline);
const rememberThemeAction = mock(rejectAsOffline);
const rememberTimeZoneAction = mock(rejectAsOffline);
const searchInstantPageCandidatesAction = mock(rejectAsOffline);
const refresh = mock(() => undefined);

mock.module('@/modules/pages/trust/server/actions/pages.usage.actions', () => ({ recordPageViewAction }));
mock.module('@/shared/server/actions/theme.actions', () => ({ rememberThemeAction }));
mock.module('@/shared/server/actions/time-zone.actions', () => ({ rememberTimeZoneAction }));
mock.module('@/modules/search/server/actions/search.instant.actions', () => ({ searchInstantPageCandidatesAction }));
mock.module('@/i18n/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { PagesUsageRecorder } = await import('@/modules/pages/trust/components/pages.usage.recorder');
const { PagesCollectionTimeZone } = await import('@/modules/pages/collections/components/pages.collection.time-zone');
const { useTheme } = await import('@/shared/hooks/use.theme.hook');
const { useCommandBarSearch } = await import('@/shared/hooks/use.command-bar-search.hook');

const unhandled: unknown[] = [];
const collectUnhandled = (reason: unknown): void => {
  unhandled.push(reason);
};

const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
};

describe('background server actions while the server is unreachable', () => {
  beforeEach(() => {
    unhandled.length = 0;
    process.on('unhandledRejection', collectUnhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', collectUnhandled);
  });

  it('does not leave the page view record unhandled', async () => {
    render(<PagesUsageRecorder pageId="page-1" />);
    await settle();

    expect(recordPageViewAction).toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it('does not leave the remembered theme unhandled', async () => {
    const { result } = renderHook(() => useTheme('dark'));
    act(() => result.current.choose('light'));
    await settle();

    expect(rememberThemeAction).toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it('does not leave the remembered time zone unhandled, and does not refresh a view it could not tell', async () => {
    render(<PagesCollectionTimeZone knownTimeZone="Nowhere/Land" />);
    await settle();

    expect(rememberTimeZoneAction).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it('answers a search with no candidates instead of leaving the rejection unhandled', async () => {
    const { result } = renderHook(() => useCommandBarSearch('roadmap'));
    await settle();

    expect(searchInstantPageCandidatesAction).toHaveBeenCalled();
    expect(result.current.pages).toEqual([]);
    expect(unhandled).toEqual([]);
  });
});
