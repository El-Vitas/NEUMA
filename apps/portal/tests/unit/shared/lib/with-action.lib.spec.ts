import { describe, expect, it, mock } from 'bun:test';

const errors: unknown[] = [];

mock.module('@/lib/logger', () => ({
  logger: { error: (entry: unknown) => errors.push(entry), info: () => undefined },
}));

const { withAction } = await import('@/shared/lib/with-action.lib');
const { redirect } = await import('next/navigation');

describe('withAction', () => {
  it("lets a redirect through without logging it as a failed action, since it is Next's own control flow", async () => {
    errors.length = 0;

    const outcome = withAction({ action: 'test' }, async () => redirect('/es'));

    await expect(outcome).rejects.toThrow('NEXT_REDIRECT');
    expect(errors).toEqual([]);
  });

  it('logs a real failure and still throws it', async () => {
    errors.length = 0;

    const outcome = withAction({ action: 'test' }, async () => {
      throw new Error('backend down');
    });

    await expect(outcome).rejects.toThrow('backend down');
    expect(errors).toHaveLength(1);
  });
});
