import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { getBlockLiveToken } from '../server/actions/block-sync.actions';

/** Every live socket asks for a fresh token each time it connects; null means the server did not give one. */
export const requestBlockLiveToken = async (): Promise<string | null> => {
  const result = await callAction(() => getBlockLiveToken({}));
  return isActionSuccess<{ readonly token: string }>(result) ? result.data.token : null;
};
