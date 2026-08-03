import type { SearchCursor } from '../types/search.types';

const isSearchCursor = (value: unknown): value is SearchCursor => {
  if (typeof value !== 'object' || value === null) return false;
  const cursor = value as Record<string, unknown>;
  return (
    typeof cursor.rank === 'number' &&
    Number.isFinite(cursor.rank) &&
    typeof cursor.sourceId === 'string' &&
    typeof cursor.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(cursor.updatedAt))
  );
};

export const encodeSearchCursor = (cursor: SearchCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

export const decodeSearchCursor = (value: string | undefined): SearchCursor | null => {
  if (value === undefined || value.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return isSearchCursor(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
