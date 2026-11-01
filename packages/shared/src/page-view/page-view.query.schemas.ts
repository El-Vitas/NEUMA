import { z } from 'zod';
import { columnValueSchema, propertyKeySchema, rootFilterSchema, sortSchema } from './page-view.schemas.js';
import { PAGE_QUERY_LIMITS } from './page-view.query.types.js';
import { PAGE_VIEW_CALCULATION_VALUES } from './page-view.types.js';
import { isValidPageTimeZone } from './page-view.zone.lib.js';

const reducerIdSchema = z.string().min(1).max(64);

const cursorSchema = z.string().min(1).max(2048);

const groupAddressSchema = z.object({ key: columnValueSchema, subKey: columnValueSchema.optional() }).strict();

const resultsReducerSchema = z
  .object({
    cursor: cursorSchema.optional(),
    id: reducerIdSchema,
    kind: z.literal('results'),
    limit: z.number().int().min(0).max(PAGE_QUERY_LIMITS.maximumFullResultsLimit).optional(),
  })
  .strict();

const groupsReducerSchema = z
  .object({
    groupBy: propertyKeySchema.optional(),
    groupLimit: z.number().int().min(1).max(PAGE_QUERY_LIMITS.maximumGroupLimit).optional(),
    id: reducerIdSchema,
    includeHidden: z.boolean().optional(),
    kind: z.literal('groups'),
    rowsPerGroup: z.number().int().min(0).max(PAGE_QUERY_LIMITS.maximumRowsPerGroup).optional(),
    subGroupBy: propertyKeySchema.optional(),
  })
  .strict();

const groupResultsReducerSchema = z
  .object({
    cursor: cursorSchema.optional(),
    group: groupAddressSchema,
    groupBy: propertyKeySchema.optional(),
    id: reducerIdSchema,
    kind: z.literal('groupResults'),
    limit: z.number().int().min(0).max(PAGE_QUERY_LIMITS.maximumResultsLimit).optional(),
    subGroupBy: propertyKeySchema.optional(),
  })
  .strict();

const aggregationItemSchema = z
  .object({
    calculation: z.enum(PAGE_VIEW_CALCULATION_VALUES),
    id: z.string().min(1).max(220),
    propertyKey: propertyKeySchema.nullable(),
  })
  .strict();

const aggregationsReducerSchema = z
  .object({
    by: z.enum(['NONE', 'GROUP']),
    groupBy: propertyKeySchema.optional(),
    id: reducerIdSchema,
    items: z.array(aggregationItemSchema).min(1).max(20),
    kind: z.literal('aggregations'),
    subGroupBy: propertyKeySchema.optional(),
  })
  .strict();

const reducerSchema = z.discriminatedUnion('kind', [
  resultsReducerSchema,
  groupsReducerSchema,
  groupResultsReducerSchema,
  aggregationsReducerSchema,
]);

export const pageQueryRequestSchema = z
  .object({
    quickFilter: rootFilterSchema.optional(),
    reducers: z.array(reducerSchema).min(1).max(PAGE_QUERY_LIMITS.maximumReducers),
    search: z.string().max(PAGE_QUERY_LIMITS.maximumSearchLength).optional(),
    sorts: z.array(sortSchema).max(5).optional(),
    timeZone: z
      .string()
      .min(1)
      .max(64)
      .refine(isValidPageTimeZone, { message: 'Time zone is not an IANA zone name' })
      .optional(),
    viewId: z.string().min(1).max(64).optional(),
  })
  .strict()
  .refine((request) => new Set(request.reducers.map((reducer) => reducer.id)).size === request.reducers.length, {
    message: 'Reducer ids must be unique',
  });
