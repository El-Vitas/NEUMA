import { callAction, hasActionError, readActionFailureReason } from '@/shared/lib/action-result';
import { createPageAction } from '../../server/actions/pages.actions';
import {
  CAPPED_RETRY_WRITE_REASONS,
  REJECTED_CAUSE_BY_REASON,
  RETRYABLE_WRITE_REASONS,
} from '../constants/pages.view-writes.constants';
import { movePageRowAction, updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PageViewWrite, ViewWriteSendResult } from '../types/pages.view-writes.types';

const dispatch = (write: PageViewWrite): Promise<unknown> => {
  switch (write.kind) {
    case 'cell': {
      const { kind: _kind, ...input } = write;
      return updatePageRowPropertiesAction(input);
    }
    case 'move': {
      const { kind: _kind, ...input } = write;
      return movePageRowAction(input);
    }
    default: {
      const { kind: _kind, ...input } = write;
      return createPageAction(input);
    }
  }
};

/** Sends one write of a view to the action that applies it, and tells what came of it. */
export const sendViewWrite = async (write: PageViewWrite): Promise<ViewWriteSendResult> => {
  const result = await callAction(() => dispatch(write));
  if (!hasActionError(result)) return { kind: 'applied' };
  const reason = readActionFailureReason(result);
  if (RETRYABLE_WRITE_REASONS.includes(reason)) return { kind: 'offline' };
  const cause = REJECTED_CAUSE_BY_REASON[reason] ?? 'other';
  if (CAPPED_RETRY_WRITE_REASONS.includes(reason)) return { cause, kind: 'retry', message: reason };
  return { cause, kind: 'rejected', message: reason };
};
