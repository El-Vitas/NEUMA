import { describe, expect, it } from 'bun:test';
import { mapActionResultToState } from '@/modules/auth/lib/map.action.result.lib';
import type { FormMessageKey } from '@/modules/auth/types/auth.form.types';

describe('mapActionResultToState', () => {
  it('returns a translation key for validation failures', () => {
    expect(mapActionResultToState({ validationErrors: {} })).toEqual({
      message: '',
      messageKey: 'validationError',
    });
  });

  it('turns a refused sign-in into one message that does not tell a wrong password from an unknown email', () => {
    expect(mapActionResultToState({ serverError: 'forbidden' })).toEqual({
      message: '',
      messageKey: 'invalidCredentials',
    });
  });

  it.each<[string, FormMessageKey]>([
    ['rateLimited', 'rateLimited'],
    ['offline', 'offline'],
    ['unexpected', 'unexpected'],
    ['conflict', 'unexpected'],
    ['not-a-known-reason', 'unexpected'],
  ])('maps the failure reason %s to the message %s, never to the raw code', (reason, key) => {
    expect(mapActionResultToState({ serverError: reason })).toEqual({ message: '', messageKey: key });
  });
});
