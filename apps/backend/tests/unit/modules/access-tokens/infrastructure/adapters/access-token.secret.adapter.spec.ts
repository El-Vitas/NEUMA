import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_SECRET_PREFIX } from '@/modules/access-tokens/constants/access-tokens.constants';
import {
  generateAccessTokenSecret,
  hashAccessTokenSecret,
  mintAccessTokenSecret,
} from '@/modules/access-tokens/infrastructure/adapters/access-token.secret.adapter';

const someRandomBytes = new Uint8Array(32).fill(7);

describe('el secreto de un token de acceso', () => {
  it('starts with a prefix that says what it is, so a leaked one can be recognized', () => {
    expect(mintAccessTokenSecret(someRandomBytes).startsWith(ACCESS_TOKEN_SECRET_PREFIX)).toBe(true);
  });

  it('comes out different each time it is generated', () => {
    expect(generateAccessTokenSecret()).not.toBe(generateAccessTokenSecret());
  });

  /** Lo que se guarda no sirve para entrar: si la base se filtra, los tokens no se filtran con ella. */
  it('is kept as a hash that does not contain the secret', () => {
    const secret = mintAccessTokenSecret(someRandomBytes);

    const hash = hashAccessTokenSecret(secret);

    expect(hash).not.toContain(secret.slice(ACCESS_TOKEN_SECRET_PREFIX.length));
    expect(hashAccessTokenSecret(secret)).toBe(hash);
  });
});
