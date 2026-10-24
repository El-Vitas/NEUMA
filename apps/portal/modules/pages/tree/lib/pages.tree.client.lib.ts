import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { readTreeWindowsAction } from '../server/actions/pages.tree.actions';
import type { PageTreeChildren, PageTreeWindowRequest } from '../types/pages.tree.types';

/** The sidebar asks the server for the windows it has open; a failure is not an answer, so what is shown stays. */
export const readTreeWindowsFromServer = async (
  spaceId: string,
  requests: readonly PageTreeWindowRequest[],
): Promise<readonly PageTreeChildren[] | null> => {
  const result = await callAction(() => readTreeWindowsAction({ requests: [...requests], spaceId }));
  return isActionSuccess<PageTreeChildren[]>(result) ? result.data : null;
};
