'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { PAGE_SHARING_LOADING_STATE } from '../constants/pages.sharing.constants';
import { getBlockAccessAction } from '../server/actions/pages.sharing.actions';
import type { BlockAccess, SharingAccessState } from '../types/pages.sharing.types';

/** Asks the server who has access each time it mounts, because the answer is only for someone with full access. */
export const usePagesSharingAccess = (blockId: string) => {
  const [state, setState] = useState<SharingAccessState>(PAGE_SHARING_LOADING_STATE);
  const latestRequestRef = useRef(0);

  const load = useCallback((): void => {
    latestRequestRef.current += 1;
    const request = latestRequestRef.current;
    void callAction(() => getBlockAccessAction({ blockId })).then((result) => {
      if (request !== latestRequestRef.current) return;
      setState(
        isActionSuccess<BlockAccess>(result)
          ? { access: result.data, kind: 'ready' }
          : { kind: 'failed', reason: readActionFailureReason(result) },
      );
    });
  }, [blockId]);

  useEffect(() => {
    load();
    const latestRequest = latestRequestRef;
    return () => {
      latestRequest.current += 1;
    };
  }, [load]);

  const reload = useCallback((): void => {
    setState(PAGE_SHARING_LOADING_STATE);
    load();
  }, [load]);

  return { reload, state };
};
