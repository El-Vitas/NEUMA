import { BLOCK_SYNC_PRESENCE_THROTTLE_MS } from '../constants/block-sync.constants';
import type { CursorReporter } from '../types/block-sync.types';

/** Tells where the cursor is at most once per throttle window, and only when the block changed. */
export const createCursorReporter = (sendPresence: (blockId: string | null) => void): CursorReporter => {
  let wanted: string | null | undefined;
  let sent: string | null | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const sendWanted = (): void => {
    if (wanted === undefined || wanted === sent) return;
    sent = wanted;
    sendPresence(wanted);
  };

  return {
    destroy: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    report: (blockId) => {
      wanted = blockId;
      if (timer !== null) return;
      sendWanted();
      timer = setTimeout(() => {
        timer = null;
        sendWanted();
      }, BLOCK_SYNC_PRESENCE_THROTTLE_MS);
    },
    resend: () => {
      sent = undefined;
      sendWanted();
    },
  };
};
