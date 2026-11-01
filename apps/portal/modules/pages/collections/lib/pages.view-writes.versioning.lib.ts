import type { ExpectedVersionStamper, PageViewWrite } from '../types/pages.view-writes.types';

/**
 * Puts on a cell or move the version its row had when the person edited it, so the server can refuse it if someone
 * else changed the row since. A row that this browser has just written is skipped until a newer version arrives: its
 * own earlier edit moved the version, and the second edit must not be refused for it.
 */
export const createExpectedVersionStamper = (): ExpectedVersionStamper => {
  const versionSentByRow = new Map<string, number>();

  return (write, rowVersion) => {
    if (write.kind === 'create' || rowVersion === undefined || rowVersion <= 0) return write;
    const rowId = write.kind === 'cell' ? write.pageId : write.rowId;
    if (versionSentByRow.get(rowId) === rowVersion) return write;
    versionSentByRow.set(rowId, rowVersion);
    return { ...write, expectedVersion: rowVersion };
  };
};

/** A write sent again at the person's request carries no version: what they wrote wins over what changed. */
export const withoutExpectedVersion = (write: PageViewWrite): PageViewWrite => {
  if (write.kind === 'create') return write;
  const { expectedVersion: _expectedVersion, ...rest } = write;
  return rest;
};
