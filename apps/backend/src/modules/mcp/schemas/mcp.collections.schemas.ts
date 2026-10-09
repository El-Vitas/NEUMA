import {
  PAGE_FILTER_OPERATOR_VALUES,
  PAGE_PROPERTY_TYPE,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_SORT_DIRECTION_VALUES,
  PAGE_VIEW_TYPE_VALUES,
} from '@company-brain/shared';
import { z } from 'zod';
import {
  MCP_COLLECTION_CHANGE_LIMIT,
  MCP_COLUMN_NAME_MAX_LENGTH,
  MCP_LISTED_PAGE_PART_DEFAULT,
  MCP_LISTED_PAGE_PART_MAX,
  MCP_ROW_TEXT_MAX_LENGTH,
  MCP_SORT_RULE_LIMIT,
  MCP_TITLE_MAX_LENGTH,
  MCP_VALUE_TEXT_MAX_LENGTH,
  MCP_WHERE_CONDITION_LIMIT,
} from '../constants/mcp.limits.constants';
import { buildMcpAddressSchema, buildMcpOffsetCursorSchema, mcpRequestIdShape } from './mcp.common.schemas';

const collectionSchema = buildMcpAddressSchema(
  'The collection (a table or board): a Company Brain link to it, or its page id.',
);

const columnSchema = z
  .string()
  .trim()
  .min(1)
  .max(MCP_COLUMN_NAME_MAX_LENGTH)
  .describe('A column, by its key or by its name as people see it.');

const textSchema = z.string().max(MCP_VALUE_TEXT_MAX_LENGTH);

const cellValueSchema = z.union([
  textSchema,
  z.number(),
  z.boolean(),
  z.array(textSchema).max(MCP_COLLECTION_CHANGE_LIMIT),
  z.null(),
]);

const cellValuesSchema = z
  .record(z.string().max(MCP_COLUMN_NAME_MAX_LENGTH), cellValueSchema)
  .refine((values) => Object.keys(values).length <= MCP_COLLECTION_CHANGE_LIMIT, {
    message: `Give at most ${String(MCP_COLLECTION_CHANGE_LIMIT)} columns at once.`,
  })
  .describe(
    'Values by column (key or name). An option is given by its name; a person by their name or id; a date as YYYY-MM-DD; null empties the cell.',
  );

const whereSchema = z
  .array(
    z.object({
      column: columnSchema,
      operator: z.enum(PAGE_FILTER_OPERATOR_VALUES),
      value: cellValueSchema.optional(),
    }),
  )
  .max(MCP_WHERE_CONDITION_LIMIT)
  .describe('Conditions the rows must all meet.');

const sortSchema = z
  .array(z.object({ column: columnSchema, direction: z.enum(PAGE_SORT_DIRECTION_VALUES) }))
  .max(MCP_SORT_RULE_LIMIT)
  .describe('The order, first rule first.');

const viewNameSchema = z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH);

const cursorSchema = buildMcpOffsetCursorSchema('To read the next part: the cursor the previous part returned.');

const addableColumnTypes = PAGE_PROPERTY_TYPE_VALUES.filter((type) => type !== PAGE_PROPERTY_TYPE.TITLE);

const newColumnSchema = z.object({
  name: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH),
  options: z
    .array(z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH))
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional(),
  type: z.enum(addableColumnTypes),
});

const namedInTheirLanguageSchema = z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH);

export const createCollectionInputSchema = z.object({
  columns: z
    .array(newColumnSchema)
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional()
    .describe('Its columns besides the one that names each row, such as a status with its options or a due date.'),
  parent: collectionSchema.optional().describe('Create it under this page (a link or id).'),
  space: z.uuid().optional().describe('Create it at the top of this space.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH),
  titleColumn: namedInTheirLanguageSchema.describe(
    'The name of the column that names each row, in the language of the people who use it, such as "Name" or "Nombre".',
  ),
  viewName: namedInTheirLanguageSchema.describe(
    'The name of its first view, a table, in the language of the people who use it, such as "Table" or "Tabla".',
  ),
  ...mcpRequestIdShape,
});

export const getCollectionInputSchema = z.object({ collection: collectionSchema });

export const queryCollectionInputSchema = z.object({
  collection: collectionSchema,
  cursor: cursorSchema,
  limit: z.number().int().min(1).max(MCP_LISTED_PAGE_PART_MAX).default(MCP_LISTED_PAGE_PART_DEFAULT),
  sort: sortSchema.optional(),
  view: viewNameSchema.optional().describe('Read the rows as this view shows them, with its filter and order.'),
  where: whereSchema.optional(),
});

export const createRowInputSchema = z.object({
  collection: collectionSchema,
  properties: cellValuesSchema.optional(),
  text: z
    .string()
    .max(MCP_ROW_TEXT_MAX_LENGTH)
    .optional()
    .describe('What the row page says, as plain paragraphs separated by blank lines.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH),
  ...mcpRequestIdShape,
});

export const updateRowInputSchema = z.object({
  properties: cellValuesSchema.optional(),
  row: buildMcpAddressSchema('The row: a Company Brain link to it, or its page id.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH).optional(),
});

export const updateCollectionColumnsInputSchema = z.object({
  addColumns: z.array(newColumnSchema).max(MCP_COLLECTION_CHANGE_LIMIT).optional(),
  addOptions: z
    .array(
      z.object({
        column: columnSchema,
        options: z
          .array(z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH))
          .min(1)
          .max(MCP_COLLECTION_CHANGE_LIMIT),
      }),
    )
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional(),
  collection: collectionSchema,
  removeColumns: z.array(columnSchema).max(MCP_COLLECTION_CHANGE_LIMIT).optional(),
  removeOptions: z
    .array(z.object({ column: columnSchema, option: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH) }))
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional()
    .describe('Rows that had the option are left empty in that column.'),
  renameColumns: z
    .array(z.object({ column: columnSchema, name: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH) }))
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional(),
  renameOptions: z
    .array(
      z.object({
        column: columnSchema,
        from: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH),
        to: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH),
      }),
    )
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional()
    .describe('Rows that had the option keep it, under its new name.'),
});

const viewShapeSchema = {
  groupBy: columnSchema.nullable().optional().describe('The column that makes the groups; a board needs one.'),
  sort: sortSchema.optional(),
  visibleColumns: z.array(columnSchema).max(MCP_COLLECTION_CHANGE_LIMIT).optional().describe('The columns it shows.'),
  where: whereSchema.optional(),
};

export const createViewInputSchema = z.object({
  collection: collectionSchema,
  makeDefault: z.boolean().optional().describe('Make it the view the collection opens with.'),
  name: viewNameSchema,
  type: z.enum(PAGE_VIEW_TYPE_VALUES),
  ...viewShapeSchema,
  ...mcpRequestIdShape,
});

export const updateViewInputSchema = z.object({
  collection: collectionSchema,
  makeDefault: z.boolean().optional().describe('Make it the view the collection opens with.'),
  name: viewNameSchema.optional().describe('A new name for the view.'),
  view: viewNameSchema.describe('The view to change, by its name.'),
  ...viewShapeSchema,
});

export const deleteViewInputSchema = z.object({ collection: collectionSchema, view: viewNameSchema });

const outputColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  type: z.string(),
});

const outputViewSchema = z.object({
  filter: z.string().nullable(),
  groupBy: z.string().nullable(),
  isDefault: z.boolean(),
  name: z.string(),
  type: z.string(),
});

export const collectionOutputSchema = z.object({
  columns: z.array(outputColumnSchema),
  id: z.string(),
  title: z.string(),
  url: z.url(),
  views: z.array(outputViewSchema),
});

const outputPropertySchema = z.object({
  key: z.string(),
  label: z.string(),
  people: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
});

const outputRowSchema = z.object({
  id: z.string(),
  properties: z.array(outputPropertySchema),
  title: z.string(),
  url: z.url(),
});

export const queryCollectionOutputSchema = z.object({
  nextCursor: z.string().optional(),
  rows: z.array(outputRowSchema),
  total: z.number().int().nonnegative(),
  /** Rows beyond the read cap are not in the total. */
  truncated: z.boolean(),
});

export const rowOutputSchema = outputRowSchema;
