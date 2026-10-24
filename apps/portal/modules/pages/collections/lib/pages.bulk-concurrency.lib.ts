/**
 * Runs `work` over the items with at most `limit` in flight, so a selection of a thousand rows does not fire a
 * thousand requests at once. The answers come back in the order of the items; `onProgress` hears how many are done.
 */
export const mapWithConcurrency = async <Item, Answer>(
  items: readonly Item[],
  limit: number,
  work: (item: Item) => Promise<Answer>,
  onProgress?: (done: number) => void,
): Promise<readonly Answer[]> => {
  const answers: Answer[] = [];
  let next = 0;
  let done = 0;

  const runLane = async (): Promise<void> => {
    while (next < items.length) {
      const position = next;
      next += 1;
      const item = items[position];
      if (item === undefined) continue;
      answers[position] = await work(item);
      done += 1;
      onProgress?.(done);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runLane));
  return answers;
};
