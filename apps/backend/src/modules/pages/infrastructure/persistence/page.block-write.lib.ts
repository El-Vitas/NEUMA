import { BLOCK_WRITE_FAILURE_CODE } from '../../../../common/domain/block-writer.constants';
import type { DomainError } from '../../../../common/domain/domain.error';
import type { BlockWriteFailure } from '../../../../common/types/block-writer.types';
import {
  PageContentValidationError,
  PageCycleError,
  PageLifecycleError,
  PageLockedError,
  PageParentError,
  PageVersionConflictError,
} from '../../domain/page.error';
import { PageBlockWriteError } from '../errors/page.block-write.error';

/**
 * What the blocks module refused, in the terms of a page. A refusal that says the writer may not touch the page, or
 * cannot see it, is the same answer a missing page gets: `null`. One this module does not know is not a thing to
 * answer, so it is thrown with everything the blocks module said.
 */
export const readWriteFailure = (failure: BlockWriteFailure): DomainError | null => {
  switch (failure.code) {
    case BLOCK_WRITE_FAILURE_CODE.accessDenied:
    case BLOCK_WRITE_FAILURE_CODE.editForbidden:
    case BLOCK_WRITE_FAILURE_CODE.transactionIdTaken:
      return null;
    case BLOCK_WRITE_FAILURE_CODE.locked:
      return new PageLockedError();
    case BLOCK_WRITE_FAILURE_CODE.invalidLifecycle:
      return new PageLifecycleError();
    case BLOCK_WRITE_FAILURE_CODE.cycle:
      return new PageCycleError();
    case BLOCK_WRITE_FAILURE_CODE.treeInvalid:
      return new PageParentError();
    case BLOCK_WRITE_FAILURE_CODE.versionConflict:
      return new PageVersionConflictError();
    case BLOCK_WRITE_FAILURE_CODE.contentInvalid:
      return new PageContentValidationError(failure.details);
    default:
      throw new PageBlockWriteError(failure.code, failure.message, failure.details);
  }
};
