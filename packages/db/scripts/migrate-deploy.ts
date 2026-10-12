import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

// The schema every Prisma 7 database reached; a database still owned by Prisma 7 is adopted at this state.
const PRISMA_7_FINAL_STATE_MIGRATION = '20261011T1850_baseline';

const readDatabaseUrl = (): string => {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (url === undefined || url === '') throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL must be set');
  return url;
};

const isUnadoptedPrisma7Database = async (url: string): Promise<boolean> => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query<{ adopt: boolean }>(
      `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL
        AND to_regclass('prisma_contract.marker') IS NULL AS "adopt"`,
    );
    return result.rows[0]?.adopt === true;
  } finally {
    await client.end();
  }
};

const runPrisma = (url: string, args: readonly string[]): void => {
  const result = spawnSync('bunx', ['prisma', ...args, '--db', url], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`prisma ${args.join(' ')} exited with status ${String(result.status)}`);
};

const deployMigrations = async (): Promise<void> => {
  const url = readDatabaseUrl();
  // db sign refuses unless the live schema matches that state exactly, so a half-migrated database stops here.
  if (await isUnadoptedPrisma7Database(url))
    runPrisma(url, ['db', 'sign', '--contract', PRISMA_7_FINAL_STATE_MIGRATION, '--no-advance-ref']);
  runPrisma(url, ['db', 'migrate']);
};

try {
  await deployMigrations();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Migration deploy failed: ${message}\n`);
  process.exitCode = 1;
}
