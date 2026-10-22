import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { getBlockLiveToken } from '../../block-sync/server/actions/block-sync.actions';
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

export const requestPageTreeLiveToken = async (): Promise<string | null> => {
  const result = await callAction(() => getBlockLiveToken({}));
  return isActionSuccess<{ readonly token: string }>(result) ? result.data.token : null;
};
