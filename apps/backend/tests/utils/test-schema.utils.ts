import { randomUUID } from 'node:crypto';

const SCHEMA_PREFIX = 'test_schema_';
const SCHEMA_ID_TRUNCATE_LENGTH = 8;

export const generateSchemaId = (): string =>
  `${SCHEMA_PREFIX}${randomUUID().replaceAll('-', '').slice(0, SCHEMA_ID_TRUNCATE_LENGTH)}`;

export const buildTestDatabaseUrl = (baseUrl: string, schemaId: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schemaId);
  return url.toString();
};
