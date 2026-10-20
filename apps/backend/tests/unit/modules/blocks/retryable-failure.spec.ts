import { describe, expect, it } from 'bun:test';
import { isRetryableTransactionFailure } from '@neuma/db';

const withState = (sqlState: string, message = 'database error'): Error =>
  Object.assign(new Error(message), { sqlState });

describe('isRetryableTransactionFailure', () => {
  it('is true for a deadlock and for a serialization failure', () => {
    expect(isRetryableTransactionFailure(withState('40P01'))).toBe(true);
    expect(isRetryableTransactionFailure(withState('40001'))).toBe(true);
  });

  it('finds the state on the cause of a wrapped error', () => {
    expect(isRetryableTransactionFailure(new Error('commit failed', { cause: withState('40P01') }))).toBe(true);
  });

  it('is false for other database errors and for things that are not errors', () => {
    expect(isRetryableTransactionFailure(withState('23505'))).toBe(false);
    expect(isRetryableTransactionFailure(new Error('plain'))).toBe(false);
    expect(isRetryableTransactionFailure(undefined)).toBe(false);
    expect(isRetryableTransactionFailure('40P01')).toBe(false);
  });
});
