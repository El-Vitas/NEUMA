import { Result } from '../result.js';
import type { BLOCK_DOCUMENT_ERROR_CODE } from './block-document.constants.js';

export type BlockDocumentErrorCode = (typeof BLOCK_DOCUMENT_ERROR_CODE)[keyof typeof BLOCK_DOCUMENT_ERROR_CODE];

/** Says what went wrong and where, in the message, so a migration log points at the node or block. */
export class BlockDocumentError extends Error {
  public readonly code: BlockDocumentErrorCode;

  public constructor(code: BlockDocumentErrorCode, message: string) {
    super(message);
    this.name = 'BlockDocumentError';
    this.code = code;
  }
}

export const failBlockDocument = (code: BlockDocumentErrorCode, message: string): Result<never, BlockDocumentError> =>
  Result.fail(new BlockDocumentError(code, message));
