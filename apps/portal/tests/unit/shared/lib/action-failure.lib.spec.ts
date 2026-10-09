import { describe, expect, it } from 'bun:test';
import { UsersAdministrationDeniedError } from '@/modules/users/lib/users.errors';
import { ACTION_FAILURE_REASONS } from '@/shared/constants/action-failure.constants';
import { readActionFailureReasonOf } from '@/shared/lib/action-failure.lib';
import { ApiError } from '@/shared/lib/api';
import { MissingAccessTokenError } from '@/shared/lib/auth.token.error';
import { NetworkError } from '@/shared/lib/parse-json-body';
import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';

describe('readActionFailureReasonOf', () => {
  it('reads a refusal of the API by its status', () => {
    expect(readActionFailureReasonOf(new ApiError(403, 'Forbidden'))).toBe('forbidden');
    expect(readActionFailureReasonOf(new ApiError(429, 'Too many'))).toBe('rateLimited');
    expect(readActionFailureReasonOf(new ApiError(503, 'Down'))).toBe('unexpected');
  });

  /** Sin sesión, o sin administrar el espacio de trabajo, no es un fallo nuestro: es no poder hacerlo. */
  it('reads a refusal made here by the reason it carries', () => {
    expect(readActionFailureReasonOf(new MissingAccessTokenError())).toBe('forbidden');
    expect(readActionFailureReasonOf(new UsersAdministrationDeniedError())).toBe('forbidden');
  });

  /** La llamada a la API envuelve el fallo de red: antes eso se mostraba como un error nuestro. */
  it('reads not reaching the API as being offline', () => {
    expect(readActionFailureReasonOf(new NetworkError(new TypeError('fetch failed')))).toBe('offline');
  });

  /** Un TypeError suelto casi siempre es un error del código: decir "sin conexión" lo escondería. */
  it('reads a bare TypeError as unexpected, not as being offline', () => {
    expect(readActionFailureReasonOf(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(
      'unexpected',
    );
  });

  it('reads anything else as unexpected, never as what it said', () => {
    expect(readActionFailureReasonOf(new Error('SELECT * FROM users failed'))).toBe('unexpected');
  });
});

describe('the reasons an action can fail', () => {
  /** Un motivo sin mensaje se mostraría como su clave cruda en la pantalla. */
  it('have their own words in every screen that translates them, in both languages', () => {
    const groups = [es.errors.reasons, es.accessTokens.errors, en.errors.reasons, en.accessTokens.errors];

    for (const translated of groups) {
      expect(Object.keys(translated).sort()).toEqual([...ACTION_FAILURE_REASONS].sort());
    }
  });

  /** Un tope de llamadas o un pedido demasiado grande no es un fallo de nuestro lado: se dice qué hacer. */
  it('tell a limit reached and a request too large apart from an unexpected failure', () => {
    expect(readActionFailureReasonOf(new ApiError(429, 'Too many'))).toBe('rateLimited');
    expect(readActionFailureReasonOf(new ApiError(413, 'Too large'))).toBe('tooLarge');
  });
});
