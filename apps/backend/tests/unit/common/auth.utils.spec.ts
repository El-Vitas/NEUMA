import { describe, expect, it } from 'bun:test';
import { readBearerToken } from '@/common/utils/auth.utils';

describe('readBearerToken', () => {
  it('reads the key whatever the case of the scheme, as HTTP allows', () => {
    expect(readBearerToken('Bearer cbk_key')).toBe('cbk_key');
    expect(readBearerToken('bearer cbk_key')).toBe('cbk_key');
    expect(readBearerToken('BEARER cbk_key')).toBe('cbk_key');
  });

  it('reads the key when more than one space separates it from the scheme', () => {
    expect(readBearerToken('Bearer   cbk_key')).toBe('cbk_key');
  });

  it('reads nothing from another scheme, an empty key or no header at all', () => {
    expect(readBearerToken('Basic dXNlcjpwYXNz')).toBeUndefined();
    expect(readBearerToken('Bearer ')).toBeUndefined();
    expect(readBearerToken('Bearer one two')).toBeUndefined();
    expect(readBearerToken(undefined)).toBeUndefined();
  });
});
