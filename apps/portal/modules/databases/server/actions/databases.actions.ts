'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { DATABASE_API_ROUTES, DATABASES_CACHE_TAG } from '../../constants/databases.constants';
import { createDatabaseSchema, databaseRecordMutationSchema } from '../../schemas/databases.schemas';

export const createDatabaseAction = actionClient.schema(createDatabaseSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'createDatabase' }, async () => {
    await apiServer.post(DATABASE_API_ROUTES.list, parsedInput);
    updateTag(DATABASES_CACHE_TAG);
  }),
);

export const createDatabaseRecordAction = actionClient
  .schema(databaseRecordMutationSchema.omit({ recordId: true }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createDatabaseRecord' }, async () => {
      await apiServer.post(DATABASE_API_ROUTES.records(parsedInput.databaseId), {
        propertyValues: parsedInput.propertyValues,
        title: parsedInput.title,
      });
      updateTag(`${DATABASES_CACHE_TAG}:${parsedInput.databaseId}:records`);
    }),
  );

export const updateDatabaseRecordAction = actionClient
  .schema(databaseRecordMutationSchema.extend({ recordId: databaseRecordMutationSchema.shape.recordId.unwrap() }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updateDatabaseRecord' }, async () => {
      await apiServer.patch(`${DATABASE_API_ROUTES.records(parsedInput.databaseId)}/${parsedInput.recordId}`, {
        propertyValues: parsedInput.propertyValues,
        title: parsedInput.title,
      });
      updateTag(`${DATABASES_CACHE_TAG}:${parsedInput.databaseId}:records`);
    }),
  );
