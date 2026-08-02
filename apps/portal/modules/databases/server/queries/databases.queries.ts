import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { DATABASE_API_ROUTES, DATABASES_CACHE_TAG } from '../../constants/databases.constants';
import { databaseRecordsSchema, databaseSummarySchema, databasesListSchema } from '../../schemas/databases.schemas';
import type { DatabaseRecord, DatabaseSummary } from '../../types/databases.types';

export const getDatabases = async (): Promise<Result<readonly DatabaseSummary[], Error>> =>
  withQuery({ op: 'getDatabases' }, (accessToken) => getDatabasesCached(accessToken));

export const getDatabase = async (databaseId: string): Promise<Result<DatabaseSummary, Error>> =>
  withQuery({ op: 'getDatabase', params: { databaseId } }, (accessToken) => getDatabaseCached(accessToken, databaseId));

export const getDatabaseRecords = async (databaseId: string): Promise<Result<readonly DatabaseRecord[], Error>> =>
  withQuery({ op: 'getDatabaseRecords', params: { databaseId } }, (accessToken) =>
    getDatabaseRecordsCached(accessToken, databaseId),
  );

const getDatabasesCached = async (accessToken: string): Promise<readonly DatabaseSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(DATABASES_CACHE_TAG);
  return databasesListSchema.parse(await apiRequest<unknown>(DATABASE_API_ROUTES.list, accessToken));
};

const getDatabaseCached = async (accessToken: string, databaseId: string): Promise<DatabaseSummary> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(DATABASES_CACHE_TAG, `${DATABASES_CACHE_TAG}:${databaseId}`);
  return databaseSummarySchema.parse(await apiRequest<unknown>(DATABASE_API_ROUTES.item(databaseId), accessToken));
};

const getDatabaseRecordsCached = async (
  accessToken: string,
  databaseId: string,
): Promise<readonly DatabaseRecord[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(`${DATABASES_CACHE_TAG}:${databaseId}:records`);
  return databaseRecordsSchema.parse(await apiRequest<unknown>(DATABASE_API_ROUTES.records(databaseId), accessToken));
};
