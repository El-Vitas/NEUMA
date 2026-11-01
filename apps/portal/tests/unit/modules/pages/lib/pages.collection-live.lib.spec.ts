import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { createCollectionRefreshCoalescer } from '@/modules/pages/collections/lib/pages.collection-live.lib';

describe('createCollectionRefreshCoalescer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('refreshes once for a burst of notices', () => {
    const refresh = jest.fn();
    const coalescer = createCollectionRefreshCoalescer(refresh, 150);

    for (let notice = 0; notice < 40; notice += 1) coalescer.request();
    jest.advanceTimersByTime(149);
    expect(refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes again for a notice that comes after the burst', () => {
    const refresh = jest.fn();
    const coalescer = createCollectionRefreshCoalescer(refresh, 150);

    coalescer.request();
    jest.advanceTimersByTime(150);
    coalescer.request();
    jest.advanceTimersByTime(150);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh once cancelled', () => {
    const refresh = jest.fn();
    const coalescer = createCollectionRefreshCoalescer(refresh, 150);

    coalescer.request();
    coalescer.cancel();
    jest.advanceTimersByTime(1000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not start a second refresh while the first is still running', async () => {
    let finish: () => void = () => undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const coalescer = createCollectionRefreshCoalescer(refresh, 150);

    coalescer.request();
    jest.advanceTimersByTime(150);
    coalescer.request();
    jest.advanceTimersByTime(150);
    expect(refresh).toHaveBeenCalledTimes(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(150);

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
