import { describe, expect, test } from 'bun:test';
import { Result } from './result.js';

describe('Result', () => {
  test('hands back a value that is undefined', () => {
    const result = Result.ok<string | undefined>(undefined);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeUndefined();
  });

  test('hands back an error that is undefined', () => {
    const result = Result.fail<never, string | undefined>(undefined);

    expect(result.isFail()).toBe(true);
    expect(result.getError()).toBeUndefined();
  });

  test('refuses to read a value from a failure', () => {
    expect(() => Result.fail<number>(new Error('no')).getValue()).toThrow('Cannot get value from a failed Result');
  });

  test('refuses to read an error from a success', () => {
    expect(() => Result.ok<number>(1).getError()).toThrow('Cannot get error from a successful Result');
  });
});
