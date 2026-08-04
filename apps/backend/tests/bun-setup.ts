import { afterAll, beforeAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { testEnv } from './config/test-env.config';
import { assertDatabaseReachable, withBoundedTimeout } from './helpers/database.helper';
import { applySearchDocumentGeneratedColumn } from './helpers/search-projection.fixture';
import { PostgresAdapter } from './infrastructure/adapters/postgres.adapter';
import { buildTestDatabaseUrl, generateSchemaId } from './utils/test-schema.utils';

const DATABASE_REACHABILITY_TIMEOUT_MS = 5000;
const SCHEMA_PUSH_TIMEOUT_MS = 60_000;
const SCHEMA_TEARDOWN_TIMEOUT_MS = 15_000;

const DB_PACKAGE_DIR = resolve(process.cwd(), '../../packages/db');

const withIsolatedSearchPath = (url: string, schema: string): string => {
  const parsed = new URL(url);
  parsed.searchParams.set('options', `-c search_path=${schema},public`);
  return parsed.toString();
};

const schemaId = generateSchemaId();
const testDbUrl = withIsolatedSearchPath(buildTestDatabaseUrl(testEnv.TEST_DATABASE_URL, schemaId), schemaId);

process.env.DATABASE_URL = testDbUrl;

const isTimeoutSignal = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'signal' in error && error.signal === 'SIGTERM';

const pushSchema = (): void => {
  try {
    execSync('bun run db:push', {
      cwd: DB_PACKAGE_DIR,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: testDbUrl },
      killSignal: 'SIGTERM',
      stdio: 'pipe',
      timeout: SCHEMA_PUSH_TIMEOUT_MS,
    });
  } catch (error) {
    if (isTimeoutSignal(error))
      throw new Error(
        `\`prisma db push\` did not complete within ${String(SCHEMA_PUSH_TIMEOUT_MS)}ms and was killed. ` +
          'This is not a PostgreSQL availability problem (connectivity was already verified) — it indicates ' +
          'a stuck migration lock or a genuinely broken schema. Inspect packages/db/prisma for the cause.',
      );
    const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr: unknown }).stderr) : '';
    throw new Error(`\`prisma db push\` failed for schema "${schemaId}": ${stderr || String(error)}`);
  }
};

beforeAll(async () => {
  await assertDatabaseReachable(testEnv.TEST_DATABASE_ADMIN_URL, DATABASE_REACHABILITY_TIMEOUT_MS);
  pushSchema();
  await applySearchDocumentGeneratedColumn(testDbUrl);
});

afterAll(async () => {
  const admin = new PostgresAdapter(testEnv.TEST_DATABASE_ADMIN_URL);
  await withBoundedTimeout(
    admin.connect(),
    DATABASE_REACHABILITY_TIMEOUT_MS,
    `Could not connect to PostgreSQL to tear down schema "${schemaId}" within ${String(DATABASE_REACHABILITY_TIMEOUT_MS)}ms.`,
  );
  try {
    await withBoundedTimeout(
      admin.query(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`),
      SCHEMA_TEARDOWN_TIMEOUT_MS,
      `Dropping schema "${schemaId}" did not complete within ${String(SCHEMA_TEARDOWN_TIMEOUT_MS)}ms — it may be locked by another connection.`,
    );
  } finally {
    await admin.end().catch(() => undefined);
  }
});
