import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
import type { PagePropertyValue } from '../types/pages.schema.types';
import type { PageViewWrite } from '../types/pages.view-writes.types';

/** The values a write puts in the cells it names; a null clears the cell. */
export const readWrittenValues = (write: PageViewWrite): Readonly<Record<string, null | PagePropertyValue>> => {
  if (write.kind === 'cell') return write.propertyValues;
  return write.kind === 'move' ? write.values : {};
};

/** The row a write is made to, or null when it makes a new one. */
export const readWrittenRowId = (write: PageViewWrite): null | string => {
  if (write.kind === 'cell') return write.pageId;
  return write.kind === 'move' ? write.rowId : null;
};

/** Sends again after the wait the editor uses between reconnections; returns the way to cancel it. */
export const scheduleViewWriteRetry = (run: () => void, attempt: number): (() => void) => {
  const timer = setTimeout(run, computeCollaborationReconnectDelayMs(attempt));
  return () => clearTimeout(timer);
};

/** A store with nothing to tell, for the screen that has no queue yet. */
export const subscribeToNothing = (): (() => void) => () => undefined;
