import { Result } from '@neuma/shared';

export const collectMcpResults = <TValue>(results: readonly Result<TValue, string>[]): Result<TValue[], string> => {
  const failed = results.find((result) => result.isFail());
  return failed === undefined ? Result.ok(results.map((result) => result.getValue())) : Result.fail(failed.getError());
};
