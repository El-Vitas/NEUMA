import { OFFLINE_WRITE_MESSAGE } from '../constants/pages.view-writes.constants';
import type { PageViewWrite, ViewWriteSettled } from '../types/pages.view-writes.types';
import { sendViewWrite } from './pages.view-writes.send.lib';

/** Sends a write and waits for the answer: with no network it is refused, as a view did before the queue. */
export const writeViewNow = async (write: PageViewWrite): Promise<ViewWriteSettled> => {
  const sent = await sendViewWrite(write);
  if (sent.kind === 'applied') return { kind: 'applied' };
  if (sent.kind === 'offline') return { cause: 'other', kind: 'rejected', message: OFFLINE_WRITE_MESSAGE };
  return { cause: sent.cause, kind: 'rejected', message: sent.message };
};

/** Whether a refusal is only that there was no network, which the person can fix by trying again with one. */
export const isOfflineRefusal = (settled: ViewWriteSettled): boolean =>
  settled.kind === 'rejected' && settled.message === OFFLINE_WRITE_MESSAGE;
