import { describe, expect, it } from 'bun:test';
import { mapActionResultToState } from '@/modules/auth/lib/map.action.result.lib';

describe('mapActionResultToState', () => {
  it('returns a translation key for validation failures', () => {
    expect(mapActionResultToState({ validationErrors: {} })).toEqual({
      message: '',
      messageKey: 'validationError',
    });
  });
});
