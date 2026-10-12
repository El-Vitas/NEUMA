import { describe, expect, it } from 'bun:test';
import { callAction, readActionFailureReason } from '@/shared/lib/action-result';

describe('callAction', () => {
  it('hands back what the action answered', async () => {
    expect(await callAction(() => Promise.resolve({ data: { id: 'a' } }))).toEqual({ data: { id: 'a' } });
    expect(await callAction(() => Promise.resolve({ serverError: 'forbidden' }))).toEqual({ serverError: 'forbidden' });
  });

  it('answers as offline when the call never reached the server', async () => {
    const answer = await callAction(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(readActionFailureReason(answer)).toBe('offline');
  });
});
