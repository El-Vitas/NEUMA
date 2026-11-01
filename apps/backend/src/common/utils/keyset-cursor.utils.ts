import type { KeysetPosition } from '../types/keyset-cursor.types';

/** A position in a list ordered by date and id, as an opaque string a client sends back to continue. */
export const encodeKeysetCursor = (position: KeysetPosition): string =>
  Buffer.from(`${position.at.toISOString()}|${position.id}`, 'utf8').toString('base64url');

/** Null for anything that was not produced by `encodeKeysetCursor`, so a forged cursor reads as the first page. */
export const decodeKeysetCursor = (cursor: string | undefined): KeysetPosition | null => {
  if (cursor === undefined || cursor.length === 0) return null;
  const [isoDate, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (isoDate === undefined || id === undefined || id.length === 0) return null;
  const at = new Date(isoDate);
  return Number.isNaN(at.getTime()) ? null : { at, id };
};
