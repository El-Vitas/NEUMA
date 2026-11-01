import { ActionRefusalError } from '@/shared/lib/action-refusal.error';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { PAGE_RELATION_REFUSAL_REASON_BY_CODE } from '../constants/pages.relations.constants';

/** The backend answered 200 but refused the transaction: the reason is the one a screen translates. */
export class PageRelationRefusedError extends ActionRefusalError {
  readonly reason: ActionFailureReason;

  constructor(code: string) {
    super(`The relation change was refused: ${code}`);
    this.name = 'PageRelationRefusedError';
    this.reason = PAGE_RELATION_REFUSAL_REASON_BY_CODE[code] ?? 'unexpected';
  }
}
