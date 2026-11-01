import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { readRevokedRowsAction } from '../server/actions/pages.collections.actions';
import type { HeldRowVersion } from '../types/pages.view-cache.types';

/** The rows a view cited before and a fresh read no longer cites. */
export const listDroppedIds = (previousIds: readonly string[], currentIds: readonly string[]): readonly string[] => {
  const current = new Set(currentIds);
  return previousIds.filter((id) => !current.has(id));
};

/** Which of the rows named the reader may no longer open; null when the server could not be asked. */
export const readRevokedRows = async (held: readonly HeldRowVersion[]): Promise<null | readonly string[]> => {
  const result = await callAction(() => readRevokedRowsAction({ rows: [...held] }));
  return isActionSuccess<readonly string[]>(result) ? result.data : null;
};
