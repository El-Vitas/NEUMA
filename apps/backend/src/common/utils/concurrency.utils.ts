/**
 * Runs the same work over many things, a few at a time.
 *
 * Asking for all of them at once is what starves the connection pool: each one
 * here opens its own transaction, and a hundred transactions want a hundred
 * connections that do not exist. The cost is wall-clock — a batch finishes in
 * rounds rather than in one — which is the right thing to spend, since the
 * alternative is the rest of the application waiting behind it.
 *
 * Nothing is abandoned when one fails: whatever `run` decides to do about a
 * failure is its own business, and every item is still reached.
 */
export const mapWithBoundedConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<readonly R[]> => {
  const answers = Array.from<R>({ length: items.length });
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const at = nextIndex;
      nextIndex += 1;
      const item = items[at];
      if (item !== undefined) answers[at] = await run(item);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return answers;
};
