import { afterAll, beforeAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { testEnv } from './config/test-env.config';
import { PostgresAdapter } from './infrastructure/adapters/postgres.adapter';
import { buildTestDatabaseUrl, generateSchemaId } from './utils/test-schema.utils';

const DB_PACKAGE_DIR = resolve(process.cwd(), '../../packages/db');

const schemaId = generateSchemaId();
const testDbUrl = buildTestDatabaseUrl(testEnv.TEST_DATABASE_URL, schemaId);

process.env.DATABASE_URL = testDbUrl;

beforeAll(() => {
  execSync('bun run db:push', {
    cwd: DB_PACKAGE_DIR,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });
});

afterAll(async () => {
  const admin = new PostgresAdapter(testEnv.TEST_DATABASE_ADMIN_URL);
  await admin.connect();
  await admin.query(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`);
  await admin.end();
});
