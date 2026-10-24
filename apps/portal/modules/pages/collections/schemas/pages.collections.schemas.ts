import {
  PAGE_FORMULA_SOURCE_MAX_LENGTH,
  PAGE_OPTION_COLOR_VALUES,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_QUERY_LIMITS,
  PAGE_STATUS_GROUP_VALUES,
  PAGE_VIEW_TYPE_VALUES,
  pageContentSchema,
  pageFilterSchema,
} from '@neuma/shared';
import { z } from 'zod';
import { PAGE_VIEW_REFRESH_MAXIMUM_ROWS } from '../constants/pages.query.constants';
import { PAGE_REVOCATION_CHECK_BATCH_ROWS } from '../constants/pages.view-cache.constants';
import { pagePropertyConfigSchema, pagePropertyValueSchema } from './pages.schema.schemas';

const pageCollectionOptionSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  group: z.enum(PAGE_STATUS_GROUP_VALUES).nullable().optional(),
  id: z.string().min(1).max(40).nullable().optional(),
  value: z.string().min(1).max(200),
});

const pageComputedDraftSchema = z.object({
  formula: z.string().max(PAGE_FORMULA_SOURCE_MAX_LENGTH).nullable(),
  rollup: z
    .object({
      calculation: z.string().min(1).max(80),
      relationPropertyKey: z.string().min(1).max(80),
      targetPropertyKey: z.string().min(1).max(80),
    })
    .nullable(),
});

const pageCollectionPropertySchema = z.object({
  computedDraft: pageComputedDraftSchema.optional(),
  config: pagePropertyConfigSchema.optional(),
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  options: z.array(pageCollectionOptionSchema).max(50).readonly().nullable(),
  required: z.boolean(),
  twoWay: z.boolean().optional(),
  type: z.enum(PAGE_PROPERTY_TYPE_VALUES),
});

const pageCollectionViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  id: z.string().min(1).max(64).optional(),
  isDefault: z.boolean(),
  name: z.string().min(1).max(200),
  type: z.enum(PAGE_VIEW_TYPE_VALUES),
});

/** What narrows the rows of a view besides its saved filter. */
const pageRowRefinementShape = {
  quickFilter: pageFilterSchema.nullable().default(null),
  search: z.string().max(PAGE_QUERY_LIMITS.maximumSearchLength).default(''),
};

export const pageCollectionCreateSchema = z.object({
  content: pageContentSchema,
  /** The id the page takes, so creating it again after a failure finds the same page. */
  id: z.uuid().optional(),
  // Absent when created from the space root.
  parentId: z.string().min(1).optional(),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});

export const pageCollectionReadSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

/** Only the properties that changed are sent. A `null` value clears the property. */
export const pageRowPropertiesSchema = z.object({
  /** The version of the row when the edit began; the server refuses the write if the row has moved on. */
  expectedVersion: z.number().int().min(0).optional(),
  pageId: z.string().min(1),
  propertyValues: z.record(z.string(), z.union([pagePropertyValueSchema, z.null()])),
  spaceId: z.string().min(1),
});

/** A change notice reached an open view: the space's cached reads are dropped so the next one is fresh. */
export const pageCollectionRefreshSchema = z.object({ spaceId: z.string().min(1) });

/** The counts of a view read again, because cards were placed in the browser and the totals are the server's. */
export const pageAggregatesRefreshSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  pageId: z.string().min(1),
  ...pageRowRefinementShape,
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
  viewType: z.enum(PAGE_VIEW_TYPE_VALUES),
});

/** What changed in a collection after the cursor of the last answer (ADR 026). */
export const pageCollectionChangesSchema = z.object({
  cursor: z.string().min(1).max(300),
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

/** A relation cell changes one row at a time, so two people editing the same cell never overwrite each other. */
export const pageRowRelationChangeSchema = z.object({
  change: z.enum(['ADD', 'REMOVE']),
  propertyKey: z.string().min(1).max(80),
  rowId: z.string().min(1),
  spaceId: z.string().min(1),
  targetId: z.string().min(1),
});

export const pageRelationCandidatesSchema = z.object({
  collectionId: z.string().min(1),
  /** What the person typed; the server narrows by it, so a large collection is never read whole. */
  search: z.string().trim().max(200).optional(),
  spaceId: z.string().min(1),
});

/** Each operation is read and checked by the server by its command; here only its outline is. */
export const pageViewOperationsSchema = z.object({
  mutationId: z.string().min(1).max(64).optional(),
  operations: z
    .array(z.object({ args: z.unknown(), command: z.string().min(1), path: z.array(z.string()) }))
    .min(1)
    .max(50)
    .readonly(),
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
});

/** A card dropped in a column takes the column's value and a place beside a neighbour, in one write. */
export const pageRowMoveSchema = z.object({
  after: z.string().min(1).optional(),
  before: z.string().min(1).optional(),
  /** The version of the row when the move began; the server refuses the write if the row has moved on. */
  expectedVersion: z.number().int().min(0).optional(),
  listChanges: z
    .record(z.string(), z.object({ add: z.array(z.string().min(1)), remove: z.array(z.string().min(1)) }))
    .default({}),
  pageId: z.string().min(1),
  rowId: z.string().min(1),
  spaceId: z.string().min(1),
  values: z.record(z.string(), z.union([pagePropertyValueSchema, z.null()])),
  viewId: z.string().min(1),
});

/** More rows of the whole view or of one of its groups, from the cursor the last page ended on. */
export const pageRowsContinuationSchema = z.object({
  cursor: z.string().min(1),
  group: z.object({ key: z.string().min(1), subKey: z.string().min(1).optional() }).optional(),
  pageId: z.string().min(1),
  ...pageRowRefinementShape,
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
});

/** The rows a scope held beyond what the server drew, read again from where the server's rows end. */
export const pageRowsRefreshSchema = pageRowsContinuationSchema.extend({
  /** Absent to read the scope from its first row, as a column does when a card moved into it. */
  cursor: z.string().min(1).optional(),
  wanted: z.number().int().min(1).max(PAGE_VIEW_REFRESH_MAXIMUM_ROWS),
});

/** One page of every row the view lets through, in the manual order and without anything on top of the view. */
export const pageEveryRowSchema = z.object({
  cursor: z.string().min(1).optional(),
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
});

/** The rows a cache holds and the versions it holds them at, to learn which the reader may no longer open. */
export const pageRevokedRowsSchema = z.object({
  rows: z
    .array(z.object({ id: z.string().min(1), version: z.number().int().min(0) }))
    .min(1)
    .max(PAGE_REVOCATION_CHECK_BATCH_ROWS),
});

/** How many rows have no date in a property, to keep the count of a calendar or a timeline true after changes. */
export const pageUndatedCountSchema = z.object({
  dateProperty: z.string().min(1),
  pageId: z.string().min(1),
  ...pageRowRefinementShape,
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
});

/** Every row the view lets through with the search applied, to act on all of them. */
export const pageMatchingRowsSchema = z.object({
  pageId: z.string().min(1),
  ...pageRowRefinementShape,
  spaceId: z.string().min(1),
  viewId: z.string().min(1),
});

/** The option is named by its id, since its name may change. A null `to` removes it. */
export const pageOptionRewriteSchema = z.object({
  optionId: z.string().min(1).max(40),
  pageId: z.string().min(1),
  propertyKey: z.string().min(1).max(80),
  spaceId: z.string().min(1),
  to: z.string().trim().min(1).max(120).nullable(),
});

/** The whole shape is sent: a removed property can only be expressed by its absence from the list. */
export const pageCollectionUpdateSchema = z.object({
  pageId: z.string().min(1),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});
