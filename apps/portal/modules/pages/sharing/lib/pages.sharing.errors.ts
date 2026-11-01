import { ActionRefusalError } from '@/shared/lib/action-refusal.error';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { PAGE_SHARING_REFUSAL_REASON_BY_CODE } from '../constants/pages.sharing.constants';

/** The backend answered 200 but refused the transaction: the reason is the one a screen translates. */
export class SharingRefusedError extends ActionRefusalError {
  readonly reason: ActionFailureReason;

  constructor(code: string) {
    super(`The access change was refused: ${code}`);
    this.name = 'SharingRefusedError';
    this.reason = PAGE_SHARING_REFUSAL_REASON_BY_CODE[code] ?? 'unexpected';
  }
}
