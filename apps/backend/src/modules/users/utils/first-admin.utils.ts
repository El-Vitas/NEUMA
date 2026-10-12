import { parseArgs } from 'node:util';
import { Result } from '@neuma/shared';
import { FIRST_ADMIN_USAGE, TRAILING_LINE_BREAK } from '../constants/user.constants';
import type { FirstAdminArguments } from '../types/user.types';

export const readFirstAdminArguments = (argv: readonly string[]): Result<FirstAdminArguments> => {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: { email: { type: 'string' }, name: { type: 'string' } },
      strict: true,
    });
    if (values.email === undefined || values.name === undefined) return Result.fail(new Error(FIRST_ADMIN_USAGE));
    return Result.ok({ email: values.email, name: values.name });
  } catch (error: unknown) {
    return Result.fail(new Error(FIRST_ADMIN_USAGE, { cause: error }));
  }
};

/** Only the line break a pipe or a terminal adds is dropped; any other space is part of the password. */
export const readPasswordFromInput = (input: string): string => input.replace(TRAILING_LINE_BREAK, '');
