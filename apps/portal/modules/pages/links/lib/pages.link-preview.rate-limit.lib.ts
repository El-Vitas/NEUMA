import type {
  LinkPreviewRateLimiter,
  LinkPreviewRateLimiterSettings,
  LinkPreviewRateWindow,
} from '../types/pages.link-preview.types';

/**
 * Fixed window per key, kept in this process: it only has to stop one client from using the server as a
 * fetch amplifier, not to count exactly across instances. Expired windows are swept so keys cannot pile up.
 */
export const createLinkPreviewRateLimiter = (settings: LinkPreviewRateLimiterSettings): LinkPreviewRateLimiter => {
  const windows = new Map<string, LinkPreviewRateWindow>();

  const sweepExpired = (current: number): void => {
    for (const [key, window] of windows) {
      if (window.endsAt <= current) windows.delete(key);
    }
  };

  const isAllowed = (key: string): boolean => {
    const current = settings.now();
    const window = windows.get(key);
    if (window === undefined || window.endsAt <= current) {
      if (windows.size >= settings.trackedKeysMaximum) sweepExpired(current);
      if (windows.size >= settings.trackedKeysMaximum) return false;
      windows.set(key, { count: 1, endsAt: current + settings.windowMs });
      return true;
    }
    if (window.count >= settings.maximum) return false;
    windows.set(key, { count: window.count + 1, endsAt: window.endsAt });
    return true;
  };

  return { isAllowed };
};
