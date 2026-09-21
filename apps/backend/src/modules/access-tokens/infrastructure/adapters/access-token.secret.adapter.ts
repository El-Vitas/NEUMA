import { createHash, randomBytes } from 'node:crypto';
import { ACCESS_TOKEN_RANDOM_BYTES, ACCESS_TOKEN_SECRET_PREFIX } from '../../constants/access-tokens.constants';

/** Un secreto a partir de bytes al azar que pone quien llama, para que se pueda probar sin azar. */
export const mintAccessTokenSecret = (randomSource: Uint8Array): string =>
  `${ACCESS_TOKEN_SECRET_PREFIX}${Buffer.from(randomSource).toString('base64url')}`;

/** Un secreto nuevo, con bytes al azar del sistema. */
export const generateAccessTokenSecret = (): string => mintAccessTokenSecret(randomBytes(ACCESS_TOKEN_RANDOM_BYTES));

/**
 * Lo que se guarda en lugar del secreto.
 *
 * Un SHA-256 basta y no hace falta uno lento como el de las contraseñas: la
 * lentitud protege contraseñas que una persona eligió y que se pueden adivinar
 * probando, y un secreto de 256 bits al azar no se adivina probando.
 */
export const hashAccessTokenSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');
