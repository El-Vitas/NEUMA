import { randomUUID } from 'node:crypto';

const DATABASE_PREFIX = 'neuma_test_';
const DATABASE_ID_TRUNCATE_LENGTH = 8;

export const generateTestDatabaseName = (): string =>
  `${DATABASE_PREFIX}${randomUUID().replaceAll('-', '').slice(0, DATABASE_ID_TRUNCATE_LENGTH)}`;

export const buildTestDatabaseUrl = (baseUrl: string, databaseName: string): string => {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  url.searchParams.delete('schema');
  return url.toString();
};
