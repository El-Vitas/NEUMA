import { describe, expect, it } from 'bun:test';
import {
  describeSchemaRejection,
  isSchemaRejected,
  readSchemaRejection,
} from '@/modules/pages/collections/lib/pages.schema-rejection.lib';
import { ApiError } from '@/shared/lib/api';

const refusal = (details: unknown): ApiError =>
  new ApiError(400, 'Page schema definition is invalid', {
    code: 'PAGE_SCHEMA_DEFINITION_INVALID',
    data: { error: { code: 'PAGE_SCHEMA_DEFINITION_INVALID', details, message: 'Page schema definition is invalid' } },
  });

describe('the reason a collection shape is refused', () => {
  it('reads the code and message the server gives for a formula', () => {
    const rejection = readSchemaRejection(
      refusal({ code: 'FORMULA_SYNTAX', message: 'The formula ends before it is complete' }),
    );

    expect(rejection).toEqual({ code: 'FORMULA_SYNTAX', message: 'The formula ends before it is complete' });
  });

  it('reads a plain reason when the server gives text', () => {
    const rejection = readSchemaRejection(refusal('Schema property definition is invalid'));

    expect(rejection).toEqual({
      code: 'PAGE_SCHEMA_DEFINITION_INVALID',
      message: 'Schema property definition is invalid',
    });
  });

  it('leaves alone an error that is not a refusal of the shape', () => {
    expect(readSchemaRejection(new ApiError(500, 'boom'))).toBeNull();
    expect(readSchemaRejection(new Error('boom'))).toBeNull();
  });

  it('tells a refusal from a shape that was saved', () => {
    expect(isSchemaRejected({ rejection: { code: 'X', message: 'y' } })).toBe(true);
    expect(isSchemaRejected(null)).toBe(false);
  });

  it('writes the code and the message together', () => {
    expect(describeSchemaRejection({ code: 'PROPERTY_IN_USE', message: 'Total reads Price' })).toBe(
      'PROPERTY_IN_USE: Total reads Price',
    );
  });
});
