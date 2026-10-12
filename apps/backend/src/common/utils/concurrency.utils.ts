/**
 * Bounded so a large batch of transactions does not starve the connection pool.
 * A failure does not stop the others; `run` decides how to handle it.
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
