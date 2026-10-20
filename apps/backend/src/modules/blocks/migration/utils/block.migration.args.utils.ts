import { parseArgs } from 'node:util';
import { Result } from '@neuma/shared';
import { BLOCK_MIGRATION_MODE, BLOCK_MIGRATION_USAGE } from '../constants/block.migration.constants';
import type { BlockMigrationMode } from '../types/block.migration.types';

/** Exactly one of `--check`, `--apply` or `--verify`; anything else is refused with the usage line. */
export const readBlockMigrationMode = (argv: readonly string[]): Result<BlockMigrationMode> => {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        [BLOCK_MIGRATION_MODE.apply]: { type: 'boolean' },
        [BLOCK_MIGRATION_MODE.check]: { type: 'boolean' },
        [BLOCK_MIGRATION_MODE.verify]: { type: 'boolean' },
      },
      strict: true,
    });
    const chosen = Object.values(BLOCK_MIGRATION_MODE).filter((mode) => values[mode] === true);
    const [mode] = chosen;
    return chosen.length === 1 && mode !== undefined ? Result.ok(mode) : Result.fail(new Error(BLOCK_MIGRATION_USAGE));
  } catch (error: unknown) {
    return Result.fail(new Error(BLOCK_MIGRATION_USAGE, { cause: error }));
  }
};
