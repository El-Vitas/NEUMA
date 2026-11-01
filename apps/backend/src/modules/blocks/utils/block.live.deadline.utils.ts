/** The work did not finish by its deadline; whatever it was waiting for may never come. */
export class BlockLiveDeadlineError extends Error {
  constructor(readonly deadlineMs: number) {
    super(`The work did not finish within ${String(deadlineMs)} ms`);
    this.name = 'BlockLiveDeadlineError';
  }
}

/**
 * Runs the work and gives up on waiting for it at the deadline. The work is not stopped (a pending query cannot be),
 * but whoever waits for it is freed, so one stuck step does not hold back everything queued behind it.
 */
export const runWithDeadline = async <Value>(work: () => Promise<Value>, deadlineMs: number): Promise<Value> => {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const expiry = new Promise<never>((_resolve, reject) => {
    timers.push(
      setTimeout(() => {
        reject(new BlockLiveDeadlineError(deadlineMs));
      }, deadlineMs),
    );
  });
  try {
    return await Promise.race([work(), expiry]);
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
};
