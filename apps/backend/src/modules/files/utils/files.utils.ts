import { FILE_BYTE_RANGE_PATTERN, FILE_RANGE_UNSATISFIABLE, FILE_RANGE_WHOLE } from '../constants/files.constants';
import type { FileByteRangeRequest } from '../types/files.types';

const readLastBytes = (count: number, size: number): FileByteRangeRequest =>
  count > 0 ? { end: size - 1, kind: 'part', start: Math.max(size - count, 0) } : FILE_RANGE_UNSATISFIABLE;

/**
 * Anything that is not a single byte range (several ranges, another unit, non-numeric figures) is
 * treated as no range header. A range starting past the end is unsatisfiable, not answered with the whole file.
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
