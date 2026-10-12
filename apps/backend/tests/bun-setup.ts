import { afterAll, beforeAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { testEnv } from './config/test-env.config';
import { assertDatabaseReachable, withBoundedTimeout } from './helpers/database.helper';
import { PostgresAdapter } from './infrastructure/adapters/postgres.adapter';
import { buildTestDatabaseUrl, generateTestDatabaseName } from './utils/test-database.utils';

const DATABASE_REACHABILITY_TIMEOUT_MS = 5000;
const MIGRATION_TIMEOUT_MS = 120_000;
const DATABASE_TEARDOWN_TIMEOUT_MS = 15_000;

const DB_PACKAGE_DIR = resolve(process.cwd(), '../../packages/db');

// Prisma qualifies every table with its schema, so isolation is a database per run rather than a schema.
const databaseName = generateTestDatabaseName();
const testDbUrl = buildTestDatabaseUrl(testEnv.TEST_DATABASE_URL, databaseName);

process.env.DATABASE_URL = testDbUrl;

const isTimeoutSignal = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'signal' in error && error.signal === 'SIGTERM';

const runAgainstAdmin = async (statement: string, timeoutMessage: string): Promise<void> => {
  const admin = new PostgresAdapter(testEnv.TEST_DATABASE_ADMIN_URL);
  await withBoundedTimeout(
    admin.connect(),
    DATABASE_REACHABILITY_TIMEOUT_MS,
    `Could not connect to PostgreSQL as admin within ${String(DATABASE_REACHABILITY_TIMEOUT_MS)}ms.`,
  );
  try {
    await withBoundedTimeout(admin.query(statement), DATABASE_TEARDOWN_TIMEOUT_MS, timeoutMessage);
  } finally {
    await admin.end().catch(() => undefined);
  }
};

const migrateDatabase = (): void => {
  try {
    execSync(`bunx prisma db migrate --db "${testDbUrl}"`, {
      cwd: DB_PACKAGE_DIR,
      encoding: 'utf8',
      env: { ...process.env, DO_NOT_TRACK: '1' },
      killSignal: 'SIGTERM',
      stdio: 'pipe',
      timeout: MIGRATION_TIMEOUT_MS,
    });
  } catch (error) {
    if (isTimeoutSignal(error))
      throw new Error(
        `\`prisma db migrate\` did not complete within ${String(MIGRATION_TIMEOUT_MS)}ms and was killed. ` +
          'Connectivity was already verified, so this points at a stuck lock or a broken migration under ' +
          'packages/db/migrations.',
        { cause: error },
      );
    const output = error instanceof Error && 'stdout' in error ? String((error as { stdout: unknown }).stdout) : '';
    throw new Error(`\`prisma db migrate\` failed for database "${databaseName}": ${output || String(error)}`, {
      cause: error,
    });
  }
};

beforeAll(async () => {
  await assertDatabaseReachable(testEnv.TEST_DATABASE_ADMIN_URL, DATABASE_REACHABILITY_TIMEOUT_MS);
  await runAgainstAdmin(
    `CREATE DATABASE "${databaseName}"`,
    `Creating database "${databaseName}" did not complete within ${String(DATABASE_TEARDOWN_TIMEOUT_MS)}ms.`,
  );
  migrateDatabase();
});

afterAll(async () => {
  await runAgainstAdmin(
    `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
    `Dropping database "${databaseName}" did not complete within ${String(DATABASE_TEARDOWN_TIMEOUT_MS)}ms.`,
  );
});
