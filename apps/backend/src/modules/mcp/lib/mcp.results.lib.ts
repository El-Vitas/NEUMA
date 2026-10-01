import { Result } from '@company-brain/shared';

/** Todos los valores, o la primera razón por la que uno no se pudo obtener. */
export const collectMcpResults = <TValue>(results: readonly Result<TValue, string>[]): Result<TValue[], string> => {
  const failed = results.find((result) => result.isFail());
  return failed === undefined ? Result.ok(results.map((result) => result.getValue())) : Result.fail(failed.getError());
};
