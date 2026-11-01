import type { MessageRateLimit, MessageWindow, RegisteredMessage } from './block.live.domain.types';

export const createMessageWindow = (now: number): MessageWindow => ({ count: 0, startedAt: now });

/** Counts one message in a fixed window; a window older than the limit allows starts over. */
export const registerMessage = (window: MessageWindow, now: number, limit: MessageRateLimit): RegisteredMessage => {
  const current = now - window.startedAt >= limit.windowMs ? createMessageWindow(now) : window;
  const next = { count: current.count + 1, startedAt: current.startedAt };
  return { isAllowed: next.count <= limit.maxMessages, window: next };
};
