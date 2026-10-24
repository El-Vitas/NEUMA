import { createHash } from 'node:crypto';
import type { PageSort } from '@neuma/shared';
import { Result } from '@neuma/shared';
import { z } from 'zod';
import { PageQueryCursorStaleError } from '../domain/page-query.error';
import type { QueryCursor } from '../types/page-query.cursor.types';

/** What a cursor carries: which order it belongs to, and the value of each column of the order for the last row. */
const cursorSchema = z.object({ k: z.array(z.string().nullable()).max(32), s: z.string().max(40) }).strict();

/** Two cursors fit the same order only if the sorts and the group they read are the same. */
export const signOrder = (sorts: readonly PageSort[], groupKey: string | null): string =>
  createHash('sha256').update(JSON.stringify({ groupKey, sorts })).digest('hex').slice(0, 16);

export const encodeCursor = (signature: string, values: readonly (string | null)[]): string =>
  Buffer.from(JSON.stringify({ k: values, s: signature })).toString('base64url');

const readCursor = (encoded: string): z.ZodSafeParseResult<z.infer<typeof cursorSchema>> | null => {
  try {
    return cursorSchema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
  } catch {
    return null;
  }
};

export const decodeCursor = (encoded: string, signature: string): Result<QueryCursor, PageQueryCursorStaleError> => {
  const parsed = readCursor(encoded);
  if (parsed === null || !parsed.success || parsed.data.s !== signature) {
    return Result.fail(new PageQueryCursorStaleError());
  }
  return Result.ok({ values: parsed.data.k });
};
