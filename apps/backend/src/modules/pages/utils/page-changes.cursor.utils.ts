import { z } from 'zod';
import type { ChangesCursor } from '../types/page-changes.types';

const transactionIdSchema = z.string().regex(/^\d{1,19}$/);

/**
 * `s` is the transaction id the reader asks changes from. While a page of changes is cut, `a` is the last row it
 * ended on and `f` the watermark of the first page, which is where the next walk must start so a transaction that
 * committed late between two pages is still found.
 */
const cursorSchema = z
  .object({
    a: z.tuple([transactionIdSchema, z.string().min(1).max(64)]).optional(),
    f: transactionIdSchema.optional(),
    s: transactionIdSchema,
  })
  .strict();

export const encodeChangesCursor = (cursor: ChangesCursor): string =>
  Buffer.from(
    JSON.stringify({
      ...(cursor.after === null ? {} : { a: [cursor.after.xid, cursor.after.id] }),
      ...(cursor.fresh === null ? {} : { f: cursor.fresh }),
      s: cursor.since,
    }),
  ).toString('base64url');

/** Null when the text is not a cursor the server wrote: the reader then starts again. */
export const decodeChangesCursor = (encoded: string): ChangesCursor | null => {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
    if (!parsed.success) return null;
    return {
      after: parsed.data.a === undefined ? null : { id: parsed.data.a[1], xid: parsed.data.a[0] },
      fresh: parsed.data.f ?? null,
      since: parsed.data.s,
    };
  } catch {
    return null;
  }
};
