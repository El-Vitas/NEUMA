/** A request to the live channel that got no usable answer: `code` says why (`timeout`, `closed` or the server's). */
export class BlockLiveRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`The live channel request failed: ${code}`);
    this.name = 'BlockLiveRequestError';
    this.code = code;
  }
}

export const readRequestErrorCode = (error: unknown): string =>
  error instanceof BlockLiveRequestError ? error.code : 'unknown';
