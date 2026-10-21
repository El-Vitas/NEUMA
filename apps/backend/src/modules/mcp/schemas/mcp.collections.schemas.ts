import {
  isValidPageTimeZone,
  PAGE_CARD_SIZE_VALUES,
  PAGE_DATE_SCALE_VALUES,
  PAGE_FILTER_OPERATOR_VALUES,
  PAGE_NUMBER_FORMAT_VALUES,
  PAGE_PROPERTY_TYPE,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_SORT_DIRECTION_VALUES,
  PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH,
  PAGE_VIEW_TYPE_VALUES,
} from '@neuma/shared';
import { z } from 'zod';
import {
  MCP_AGGREGATE_CALCULATIONS,
  MCP_AGGREGATE_LIMIT,
  MCP_CHANGES_ROWS_DEFAULT,
  MCP_CHANGES_ROWS_MAX,
  MCP_CHANGES_WAIT_MAX_SECONDS,
  MCP_COLLECTION_CHANGE_LIMIT,
  MCP_COLUMN_NAME_MAX_LENGTH,
  MCP_QUERY_COLUMN_LIMIT,
  MCP_QUERY_CURSOR_MAX_LENGTH,
  MCP_QUERY_ROWS_DEFAULT,
  MCP_QUERY_ROWS_MAX,
  MCP_QUERY_SEARCH_MAX_LENGTH,
  MCP_ROW_TEXT_MAX_LENGTH,
  MCP_SORT_RULE_LIMIT,
  MCP_TIME_ZONE_MAX_LENGTH,
  MCP_TITLE_MAX_LENGTH,
  MCP_VALUE_TEXT_MAX_LENGTH,
  MCP_WHERE_CONDITION_LIMIT,
} from '../constants/mcp.limits.constants';
import { MCP_DAY_PATTERN } from '../constants/mcp.views.constants';
import { buildMcpAddressSchema, mcpRequestIdShape } from './mcp.common.schemas';

export const collectionSchema = buildMcpAddressSchema(
  'The collection (a table or board): a Neuma link to it, or its page id.',
);

const columnSchema = z
  .string()
  .trim()
  .min(1)
  .max(MCP_COLUMN_NAME_MAX_LENGTH)
  .describe('A column, by its key or by its name as people see it.');

const textSchema = z.string().max(MCP_VALUE_TEXT_MAX_LENGTH);

const conditionValueSchema = z.union([
  textSchema,
  z.number(),
  z.boolean(),
  z.array(textSchema).max(MCP_COLLECTION_CHANGE_LIMIT),
  z.null(),
]);

const relationEditSchema = z
  .object({
    add: z.array(textSchema).max(MCP_COLLECTION_CHANGE_LIMIT).optional().describe('Rows to link.'),
    remove: z.array(textSchema).max(MCP_COLLECTION_CHANGE_LIMIT).optional().describe('Rows to unlink.'),
  })
  .describe('Rows to link and unlink, each by its page id or its title.');

const cellValueSchema = z.union([conditionValueSchema, relationEditSchema]);

export const cellValuesSchema = z
  .record(z.string().max(MCP_COLUMN_NAME_MAX_LENGTH), cellValueSchema)
  .refine((values) => Object.keys(values).length <= MCP_COLLECTION_CHANGE_LIMIT, {
    message: `Give at most ${String(MCP_COLLECTION_CHANGE_LIMIT)} columns at once.`,
  })
  .describe(
    [
      'Values by column (key or name); null empties the cell. What each type takes:',
      'text, select and status: a string (a select or a status by the name of the option or by its id; a status always keeps a value, so it cannot be emptied);',
      'multi-select: a list of option names;',
      'person: a list of people, each by name, email or id (a single person unless the column allows several);',
      'date: YYYY-MM-DD, a range as YYYY-MM-DD/YYYY-MM-DD, or an instant with its time zone for a column that holds moments;',
      'number: a number, a percent as people read it (25 for 25 %), money in its units;',
      'checkbox: true or false;',
      'url, email, phone: text in that form;',
      'files: a list of the ids of files already uploaded to Neuma (this server cannot upload files);',
      'relation: { "add": [...], "remove": [...] } with rows of the other collection by page id or title, or a list that replaces all links, or null to unlink all. For a two-way relation the other side follows, and it is refused whole if the token cannot edit the row on that side;',
      'unique id, created time, created by, edited time, edited by: filled in by Neuma, never written.',
    ].join(' '),
  );

const whereSchema = z
  .array(
    z.object({
      column: columnSchema,
      operator: z.enum(PAGE_FILTER_OPERATOR_VALUES),
      value: conditionValueSchema
        .optional()
        .describe(
          'What to compare with. A date column also takes a relative date that moves with the day of the question (@today, @tomorrow, @this_week, @next_month, @past_days:7, @next_days:7 ...), and with IS_BEFORE it finds what is overdue. A person, creator or editor column takes "@me": the owner of your token.',
        ),
    }),
  )
  .max(MCP_WHERE_CONDITION_LIMIT)
  .describe('Conditions the rows must all meet.');

const sortSchema = z
  .array(z.object({ column: columnSchema, direction: z.enum(PAGE_SORT_DIRECTION_VALUES) }))
  .max(MCP_SORT_RULE_LIMIT)
  .describe('The order, first rule first.');

const viewNameSchema = z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH);

const addableColumnTypes = PAGE_PROPERTY_TYPE_VALUES.filter((type) => type !== PAGE_PROPERTY_TYPE.TITLE);

/** A new collection has no other collection to point to yet: a relation is added to it afterwards. */
const addableFirstColumnTypes = addableColumnTypes.filter((type) => type !== PAGE_PROPERTY_TYPE.RELATION);

const newColumnSchema = z.object({
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .describe('A number shown as money: its ISO currency code, such as USD or CLP.'),
  decimals: z.number().int().min(0).max(8).optional().describe('A number: the most decimals a value may have.'),
  multiple: z.boolean().optional().describe('A person column: whether a row may name more than one person.'),
  name: z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH),
  numberFormat: z.enum(PAGE_NUMBER_FORMAT_VALUES).optional().describe('A number: plain, a percent or money.'),
  options: z
    .array(z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH))
    .max(MCP_COLLECTION_CHANGE_LIMIT)
    .optional()
    .describe('A selection: its options. A status has three fixed groups and starts with one option in each.'),
  prefix: z
    .string()
    .max(PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH)
    .optional()
    .describe('A unique id: the text shown before the number, such as TSK.'),
  target: collectionSchema
    .optional()
    .describe(
      'A relation: the collection whose rows it links (a Neuma link to it, or its page id). It is chosen once and cannot change.',
    ),
  twoWay: z
    .boolean()
    .optional()
    .describe(
      'A relation: also add to the other collection a column that links back, kept in step with this one. Linking then needs edit access to the rows on both sides.',
    ),
  type: z.enum(addableColumnTypes),
});

const newFirstColumnSchema = newColumnSchema.extend({ type: z.enum(addableFirstColumnTypes) });

const namedInTheirLanguageSchema = z.string().trim().min(1).max(MCP_COLUMN_NAME_MAX_LENGTH);

export const createCollectionInputSchema = z.object({
  columns: z
    .array(newFirstColumnSchema)
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

const queryCursorSchema = z
  .string()
  .max(MCP_QUERY_CURSOR_MAX_LENGTH)
  .optional()
  .describe('To read the next part: the cursor the previous part returned, for the same question.');

const aggregateSchema = z
  .array(
    z.object({
      calculation: z.enum(MCP_AGGREGATE_CALCULATIONS),
      column: columnSchema.optional().describe('Not needed to count rows; the other calculations work on a column.'),
    }),
  )
  .max(MCP_AGGREGATE_LIMIT)
  .describe(
    'Totals over every row that matches, not only the ones returned: a sum, an average, a count of empty cells.',
  );

export const queryCollectionInputSchema = z.object({
  aggregate: aggregateSchema.optional(),
  collection: collectionSchema,
  columns: z
    .array(columnSchema)
    .max(MCP_QUERY_COLUMN_LIMIT)
    .optional()
    .describe('Return only these columns of each row (the title is always there). Leave out to get every column.'),
  cursor: queryCursorSchema,
  group: z
    .string()
    .max(MCP_COLUMN_NAME_MAX_LENGTH)
    .optional()
    .describe(
      'With a grouping, read the rows of this one group only, by the name get_collection shows for it (or "(no value)"), a part at a time with the cursor.',
    ),
  groupBy: columnSchema
    .optional()
    .describe(
      'Group the answer by this column: every group comes with how many rows it has. Without it the answer is not grouped, even if the view groups its rows.',
    ),
  limit: z
    .number()
    .int()
    .min(0)
    .max(MCP_QUERY_ROWS_MAX)
    .default(MCP_QUERY_ROWS_DEFAULT)
    .describe(
      'Rows to return (per group when grouped, at most 50 there). 0 returns no rows, only the count, the group counts and the totals asked for.',
    ),
  search: z
    .string()
    .trim()
    .max(MCP_QUERY_SEARCH_MAX_LENGTH)
    .optional()
    .describe('Only rows whose title or text cells contain this.'),
  sort: sortSchema.optional(),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TIME_ZONE_MAX_LENGTH)
    .refine(isValidPageTimeZone, { message: 'timeZone is not an IANA zone name, such as America/Santiago.' })
    .optional()
    .describe(
      'The zone whose calendar decides what "today", "this week" or "yesterday" mean and which day a moment belongs to, as an IANA name such as America/Santiago. UTC when left out.',
    ),
  view: viewNameSchema
    .optional()
    .describe('Read the rows as this view shows them, with its filter and order; where and sort replace its own.'),
  where: whereSchema.optional(),
  window: z
    .object({
      column: columnSchema.describe('A date column.'),
      from: z.string().regex(MCP_DAY_PATTERN).describe('The first day, as YYYY-MM-DD.'),
      to: z.string().regex(MCP_DAY_PATTERN).describe('The last day, as YYYY-MM-DD, included.'),
    })
    .optional()
    .describe(
      'Only the rows whose dates in that column overlap these days, as a calendar or a timeline shows them: a range that starts before the window and ends inside it counts. Sums with where and the view’s own filter. Rows with no date are left out.',
    ),
});

export const createRowInputSchema = z.object({
  collection: collectionSchema,
  properties: cellValuesSchema.optional(),
  template: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TITLE_MAX_LENGTH)
    .nullable()
    .optional()
    .describe(
      'The template the row starts from, by its name or its id (list_templates shows them). Left out, the default template of the collection is used if it has one; null starts a blank row. A template gives the row its text and its values, and fills a date with "today" and a person with you when it says so; what you give in properties and text wins over the template.',
    ),
  text: z
    .string()
    .max(MCP_ROW_TEXT_MAX_LENGTH)
    .optional()
    .describe('What the row page says, as plain paragraphs separated by blank lines.'),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TIME_ZONE_MAX_LENGTH)
    .refine(isValidPageTimeZone, { message: 'timeZone is not an IANA zone name, such as America/Santiago.' })
    .optional()
    .describe(
      'The zone whose calendar decides what "today" is when the template fills a date, as an IANA name such as America/Santiago. UTC when left out.',
    ),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH),
  ...mcpRequestIdShape,
});

export const updateRowInputSchema = z.object({
  properties: cellValuesSchema.optional(),
  row: buildMcpAddressSchema('The row: a Neuma link to it, or its page id.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH).optional(),
});

const neighbourRowSchema = buildMcpAddressSchema('The row to put it beside: a Neuma link to it, or its page id.');

export const moveRowInputSchema = z.object({
  after: neighbourRowSchema.optional().describe('Put the row right after this one in the order of the view.'),
  before: neighbourRowSchema.optional().describe('Put the row right before this one in the order of the view.'),
  properties: cellValuesSchema
    .optional()
    .describe(
      'What the row takes where it lands, by column: the status of the column of a board, the owner of its band. Only text, selection, status, person, date, number and checkbox columns; relations are linked with update_row.',
    ),
  row: buildMcpAddressSchema('The row: a Neuma link to it, or its page id.'),
  view: viewNameSchema.describe(
    'The view whose order the row is placed in, by the name get_collection shows. Each view keeps its own order.',
  ),
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
  cardSize: z.enum(PAGE_CARD_SIZE_VALUES).optional().describe('How big the cards of a gallery or a board are.'),
  coverColumn: columnSchema
    .nullable()
    .optional()
    .describe('A gallery or a board: the files column whose first image is the cover of each card. null removes it.'),
  dateColumn: columnSchema
    .nullable()
    .optional()
    .describe(
      'A calendar or a timeline: the date column that places each row (where it starts, for a timeline). A date range in it gives the row its length.',
    ),
  endDateColumn: columnSchema
    .nullable()
    .optional()
    .describe(
      'A timeline: another date column where each row ends. Leave it out to read the end from the range in dateColumn.',
    ),
  groupBy: columnSchema.nullable().optional().describe('The column that makes the groups; a board needs one.'),
  scale: z
    .enum(PAGE_DATE_SCALE_VALUES)
    .optional()
    .describe('How much time one screen holds: WEEK or MONTH for a calendar, DAY, WEEK or MONTH for a timeline.'),
  subGroupBy: columnSchema
    .nullable()
    .optional()
    .describe('A board: a second column that cuts every group into bands (swimlanes). null removes it.'),
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
  cardSize: z.string().optional(),
  coverColumn: z.string().optional(),
  dateColumn: z.string().optional(),
  endDateColumn: z.string().optional(),
  filter: z.string().nullable(),
  groupBy: z.string().nullable(),
  isDefault: z.boolean(),
  name: z.string(),
  scale: z.string().optional(),
  subGroupBy: z.string().optional(),
  type: z.string(),
});

export const collectionOutputSchema = z.object({
  columns: z.array(outputColumnSchema),
  id: z.string(),
  title: z.string(),
  url: z.url(),
  views: z.array(outputViewSchema),
});

export const outputPropertySchema = z.object({
  key: z.string(),
  label: z.string(),
  people: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  /** On a relation: the rows it points to that the reader may open. */
  related: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
  type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
});

const outputRowSchema = z.object({
  id: z.string(),
  properties: z.array(outputPropertySchema),
  title: z.string(),
  url: z.url(),
});

const aggregateValueSchema = z.union([z.string(), z.number(), z.null()]);

const aggregatesSchema = z.record(z.string(), aggregateValueSchema);

const outputGroupSchema = z.object({
  aggregates: aggregatesSchema.optional(),
  count: z.number().int().nonnegative(),
  name: z.string(),
  nextCursor: z.string().optional(),
  rows: z.array(outputRowSchema),
});

export const collectionChangesInputSchema = z.object({
  collection: collectionSchema,
  columns: z
    .array(columnSchema)
    .max(MCP_QUERY_COLUMN_LIMIT)
    .optional()
    .describe('Return only these columns of each changed row (the title is always there).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MCP_CHANGES_ROWS_MAX)
    .default(MCP_CHANGES_ROWS_DEFAULT)
    .describe('Changed rows to return. When there are more, hasMore is true: ask again with the cursor you got.'),
  since: z
    .string()
    .max(MCP_QUERY_CURSOR_MAX_LENGTH)
    .optional()
    .describe(
      'The cursor of your last read (changesCursor of query_collection, or cursor of this tool). Leave out to get the cursor to watch from now, with no rows.',
    ),
  waitSeconds: z
    .number()
    .int()
    .min(0)
    .max(MCP_CHANGES_WAIT_MAX_SECONDS)
    .default(0)
    .describe('Wait up to this many seconds for something to change instead of answering empty.'),
});

export const collectionChangesOutputSchema = z.object({
  /** Pass it back as since. */
  cursor: z.string(),
  hasMore: z.boolean(),
  /** The cursor was not valid: read the collection again with query_collection. */
  reset: z.boolean(),
  /** The rows that changed, as they are now. A row seen again with the same version has not changed. */
  rows: z.array(outputRowSchema),
  /** Every row the token can read: if it differs from the rows you hold, read again. */
  total: z.number().int().nonnegative(),
  /** Rows that went to the trash. */
  trashed: z.array(z.string()),
});

export const queryCollectionOutputSchema = z.object({
  aggregates: aggregatesSchema.optional(),
  /** Pass it to collection_changes as since to read what changes after this answer. */
  changesCursor: z.string().optional(),
  /** Present when the answer is grouped, or a single group was asked for. */
  groups: z.array(outputGroupSchema).optional(),
  /** There are more groups than one answer carries. */
  hasMoreGroups: z.boolean().optional(),
  nextCursor: z.string().optional(),
  /** Of an ungrouped answer; a grouped one has its rows in each group. */
  rows: z.array(outputRowSchema),
  /** Every row that matches, not only the ones returned. */
  total: z.number().int().nonnegative(),
});

export const rowOutputSchema = outputRowSchema;
