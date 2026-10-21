import { describe, expect, it } from 'bun:test';
import { BlockLiveDeadlineError, runWithDeadline } from '@/modules/blocks/utils/block.live.deadline.utils';

describe('runWithDeadline', () => {
  it('gives back what the work gave when it finishes in time', async () => {
    const value = await runWithDeadline(() => Promise.resolve('done'), 1000);

    expect(value).toBe('done');
  });

  it('fails with an error that has a stack when the work is still running at the deadline', async () => {
    const error = await runWithDeadline(() => new Promise<string>(() => undefined), 20).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(BlockLiveDeadlineError);
    expect((error as Error).stack).toBeDefined();
  });

  it('passes on the failure of the work', async () => {
    const error = await runWithDeadline(() => Promise.reject(new Error('boom')), 1000).catch(
      (caught: unknown) => caught,
    );

    expect((error as Error).message).toBe('boom');
  });
});
