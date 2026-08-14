import { FILE_BYTE_RANGE_PATTERN, FILE_RANGE_UNSATISFIABLE, FILE_RANGE_WHOLE } from '../constants/files.constants';
import type { FileByteRangeRequest } from '../types/files.types';

const readLastBytes = (count: number, size: number): FileByteRangeRequest =>
  count > 0 ? { end: size - 1, kind: 'part', start: Math.max(size - count, 0) } : FILE_RANGE_UNSATISFIABLE;

/**
 * Which stretch of a file was asked for.
 *
 * A player asks for the piece it is about to show rather than the whole file,
 * and that is what lets a listener jump to the middle of an hour-long recording
 * without waiting for the first fifty-nine minutes. Answering every such
 * question with the whole file is what makes a seek bar do nothing.
 *
 * Anything that is not a single stretch of bytes — several at once, a unit
 * nobody has heard of, figures that are not figures — is read as no question
 * at all; a stretch that begins past the end is refused, because answering it
 * with everything would be answering something else.
 */
export const readRequestedByteRange = (header: string | undefined, size: number): FileByteRangeRequest => {
  const asked = FILE_BYTE_RANGE_PATTERN.exec(header ?? '');
  if (asked === null) return FILE_RANGE_WHOLE;
  if (size === 0) return FILE_RANGE_UNSATISFIABLE;

  const [, from, to] = asked;
  if (from === '') return readLastBytes(Number(to), size);

  const start = Number(from);
  const end = to === '' ? size - 1 : Math.min(Number(to), size - 1);
  return start >= size || start > end ? FILE_RANGE_UNSATISFIABLE : { end, kind: 'part', start };
};
