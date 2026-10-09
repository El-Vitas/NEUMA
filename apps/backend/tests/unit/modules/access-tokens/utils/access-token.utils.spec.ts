import { describe, expect, it } from 'bun:test';
import {
  ACCESS_TOKEN_DISPLAY_LENGTH,
  ACCESS_TOKEN_LAST_USED_RESOLUTION_MS,
  ACCESS_TOKEN_SECRET_PREFIX,
} from '@/modules/access-tokens/constants/access-tokens.constants';
import { mintAccessTokenSecret } from '@/modules/access-tokens/infrastructure/adapters/access-token.secret.adapter';
import {
  isLastUseWorthRecording,
  looksLikeAccessTokenSecret,
  readAccessTokenDisplayPrefix,
} from '@/modules/access-tokens/utils/access-token.utils';

const someSecret = mintAccessTokenSecret(new Uint8Array(32).fill(7));
const now = new Date('2026-09-21T12:00:00.000Z');

describe('la forma de un token', () => {
  it('shows only its beginning, enough to tell tokens apart and not enough to use one', () => {
    expect(readAccessTokenDisplayPrefix(someSecret)).toBe(someSecret.slice(0, ACCESS_TOKEN_DISPLAY_LENGTH));
  });

  it('tells a token from something that is not one', () => {
    expect(looksLikeAccessTokenSecret(someSecret)).toBe(true);
    expect(looksLikeAccessTokenSecret('eyJhbGciOiJIUzI1NiJ9.a.b')).toBe(false);
    expect(looksLikeAccessTokenSecret(ACCESS_TOKEN_SECRET_PREFIX)).toBe(false);
  });
});

describe('cuándo anotar el último uso', () => {
  it('records the first use, and a use after the resolution window', () => {
    expect(isLastUseWorthRecording(null, now)).toBe(true);
    expect(isLastUseWorthRecording(new Date(now.getTime() - ACCESS_TOKEN_LAST_USED_RESOLUTION_MS), now)).toBe(true);
  });

  /** Un agente hace decenas de llamadas por minuto: anotar cada una es escribir sin que nadie lea. */
  it('does not record again within the same window', () => {
    expect(isLastUseWorthRecording(new Date(now.getTime() - 1000), now)).toBe(false);
  });
});
