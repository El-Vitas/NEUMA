import { createHash, randomBytes } from 'node:crypto';
import { ACCESS_TOKEN_RANDOM_BYTES, ACCESS_TOKEN_SECRET_PREFIX } from '../../constants/access-tokens.constants';

/** Takes the random bytes from the caller so it can be tested deterministically. */
export const mintAccessTokenSecret = (randomSource: Uint8Array): string =>
  `${ACCESS_TOKEN_SECRET_PREFIX}${Buffer.from(randomSource).toString('base64url')}`;

export const generateAccessTokenSecret = (): string => mintAccessTokenSecret(randomBytes(ACCESS_TOKEN_RANDOM_BYTES));

/** A plain SHA-256 suffices: slow hashes protect guessable passwords, and a 256-bit random secret is not guessable. */
export const hashAccessTokenSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');
