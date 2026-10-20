import {
  COMMENT_TEXT_MAX_LENGTH,
  PAGE_BLOCK_COLORS,
  PAGE_BUTTON_PLACES,
  PAGE_CALLOUT_ICONS,
  PAGE_CODE_LANGUAGES,
  PAGE_DIAGRAM_VIEWS,
} from '@neuma/shared';
import { z } from 'zod';
import {
  MCP_ADDRESS_MAX_LENGTH,
  MCP_BLOCK_TEXT_MAX_LENGTH,
  MCP_BLOCKS_PER_WRITE,
  MCP_BOOKMARK_TEXT_MAX_LENGTH,
  MCP_COLUMNS_MAX,
  MCP_FORMULA_MAX_LENGTH,
  MCP_ICON_SEARCH_DEFAULT,
  MCP_ICON_SEARCH_MAX,
  MCP_ID_MAX_LENGTH,
  MCP_LIST_ITEMS_PER_BLOCK,
  MCP_PAGE_ICON_MAX_LENGTH,
  MCP_TABLE_COLUMNS_MAX,
  MCP_TABLE_ROWS_MAX,
  MCP_TITLE_MAX_LENGTH,
  MCP_TOGGLE_SUMMARY_MAX_LENGTH,
  MCP_TRASH_LISTED_MAX,
} from '../constants/mcp.limits.constants';
import { buildMcpAddressSchema, mcpIdSchema, mcpRequestIdShape } from './mcp.common.schemas';

const inlineTextSchema = z
  .string()
  .max(MCP_BLOCK_TEXT_MAX_LENGTH)
  .describe(
    'Words, with inline Markdown as fetch returns it: **bold**, *italic*, `code`, ~~strike~~, <u>underlined</u>, <span color="red">coloured words</span>, <mark color="yellow">highlighted words</mark>, [label](https://…), a mention as [Page title](page link), a person as [@Name](person:<user id>), a date as [label](date:YYYY-MM-DD), a formula as $LaTeX$. Colours: gray, brown, orange, yellow, green, blue, purple, red. A line break stays inside the block.',
  );

const pageAddressSchema = buildMcpAddressSchema('The page: a Neuma link to it, or its page id.');

const toggleSummarySchema = z.string().trim().min(1).max(MCP_TOGGLE_SUMMARY_MAX_LENGTH);

const drawnViewSchema = z
  .enum(PAGE_DIAGRAM_VIEWS)
  .optional()
  .describe('What the page shows: the drawing (the default), the source, or both.');

const listItemSchema = z.union([
  inlineTextSchema,
  z.object({
    items: z.array(inlineTextSchema).max(MCP_LIST_ITEMS_PER_BLOCK).optional().describe('Items nested under this one.'),
    text: inlineTextSchema,
  }),
]);

const listItemsSchema = z.array(listItemSchema).min(1).max(MCP_LIST_ITEMS_PER_BLOCK);

const tableCellsSchema = z.array(inlineTextSchema).min(1).max(MCP_TABLE_COLUMNS_MAX);

const blockIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(MCP_ID_MAX_LENGTH)
  .describe('A block id, as fetch shows it before each block.');

const blockVariants = [
  z.object({ text: inlineTextSchema, type: z.literal('paragraph') }),
  z.object({ level: z.number().int().min(1).max(3), text: inlineTextSchema, type: z.literal('heading') }),
  z.object({ items: listItemsSchema, type: z.literal('bullet_list') }),
  z.object({ items: listItemsSchema, type: z.literal('ordered_list') }),
  z
    .object({
      items: z
        .array(z.object({ checked: z.boolean().optional(), text: inlineTextSchema }))
        .min(1)
        .max(MCP_LIST_ITEMS_PER_BLOCK),
      type: z.literal('task_list'),
    })
    .describe('A checklist: each item can be checked.'),
  z.object({ text: inlineTextSchema, type: z.literal('blockquote') }),
  z.object({ icon: z.enum(PAGE_CALLOUT_ICONS).optional(), text: inlineTextSchema, type: z.literal('callout') }),
  z
    .object({
      language: z.enum(PAGE_CODE_LANGUAGES).optional(),
      text: z.string().min(1).max(MCP_BLOCK_TEXT_MAX_LENGTH),
      type: z.literal('code_block'),
    })
    .describe('Kept exactly as written, spaces and line breaks included: code, commands, logs, ASCII drawings.'),
  z
    .object({
      source: z.string().min(1).max(MCP_BLOCK_TEXT_MAX_LENGTH),
      type: z.literal('diagram'),
      view: drawnViewSchema,
    })
    .describe(
      String.raw`A diagram drawn from Mermaid 11 source, any kind it draws: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, quadrantChart, requirementDiagram, gitGraph, C4Context, mindmap, timeline, sankey-beta, xychart-beta, block-beta, packet-beta, kanban, architecture-beta, radar-beta, and zenuml. Neuma draws real product logos and icons: when a diagram shows products, services or systems (Postgres, AWS, a server, a user), draw each with its logo or icon, found with search_diagram_icons, in an architecture-beta service or a flowchart icon node; an emoji is not an icon. C4 views (C4Context, C4Container, C4Component) are written as calls, one per line, never with flowchart arrows: Person(user, "Label", "What they do"), Container(api, "Label", "Technology", "What it does"), ContainerDb(db, "Label", "Technology", "What it keeps"), System_Ext(maps, "Label", "What it is"), System_Boundary(app, "Label") { ... }, Rel(user, api, "What it does", "Protocol"). For a crowded graph, start with ---\nconfig:\n  layout: elk\n--- to lay it out better. Data lines of sankey-beta and similar CSV-like diagrams must not be indented.`,
    ),
  z
    .object({ latex: z.string().min(1).max(MCP_FORMULA_MAX_LENGTH), type: z.literal('formula'), view: drawnViewSchema })
    .describe('A formula on its own line, in LaTeX. For one inside a sentence, write $…$ in the text instead.'),
  z.object({ type: z.literal('divider') }),
  z
    .object({ type: z.literal('table_of_contents') })
    .describe('A table of contents built from the headings of the page.'),
  z
    .object({ page: pageAddressSchema, type: z.literal('subpage') })
    .describe(
      'Shows a page as a line that opens it, as a sub-page. To add a new sub-page, create it with create_page under this page, then show it here.',
    ),
  z
    .object({
      collection: pageAddressSchema,
      type: z.literal('collection'),
      view: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH).optional().describe('One of its views, by name.'),
    })
    .describe('Shows the rows of an existing collection right here in the page, through one of its views.'),
  z
    .object({
      addsRowTo: pageAddressSchema
        .optional()
        .describe('Make it add a row to this collection, named after its text, instead of writing the text.'),
      label: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH),
      place: z
        .enum(PAGE_BUTTON_PLACES)
        .optional()
        .describe('Where what it writes lands: below it (the default), at the top or at the bottom of the page.'),
      text: inlineTextSchema.describe('What it writes each time it is pressed.'),
      type: z.literal('button'),
    })
    .describe('A button people press to write the same text again, or to add a row to a collection.'),
  z
    .object({
      header: tableCellsSchema,
      rows: z.array(tableCellsSchema).max(MCP_TABLE_ROWS_MAX),
      type: z.literal('table'),
    })
    .describe('A real table, with a header row and rows of cells. Never draw a table with | or spaces.'),
  z.object({
    summary: toggleSummarySchema,
    text: inlineTextSchema.optional().describe('What opens under it.'),
    type: z.literal('toggle'),
  }),
  z
    .object({
      description: z.string().trim().min(1).max(MCP_BOOKMARK_TEXT_MAX_LENGTH).optional(),
      title: z.string().trim().min(1).max(MCP_BOOKMARK_TEXT_MAX_LENGTH).optional(),
      type: z.literal('bookmark'),
      url: z.url().max(MCP_ADDRESS_MAX_LENGTH).describe('An http or https address.'),
    })
    .describe(
      'A link shown as a card with its title and description, which you write: Neuma never visits the link. Without a title it shows the site.',
    ),
  z
    .object({ type: z.literal('embed'), url: z.url().max(MCP_ADDRESS_MAX_LENGTH) })
    .describe('A video or design played inside the page, from YouTube, Vimeo, Loom or Figma, by its https link.'),
  z
    .object({
      block: blockIdSchema.describe('The block shown, by its id in that page.'),
      page: pageAddressSchema.describe('The page the block lives in.'),
      type: z.literal('synced'),
    })
    .describe(
      'Shows a block that lives in another page, kept in step with it: whoever changes it there changes it here.',
    ),
] as const;

const columnBlockSchema = z.discriminatedUnion('type', blockVariants);

/** Blocks are written by meaning, not appearance: a spaced-out diagram is a code block, not a table. */
export const blockInputSchema = z.discriminatedUnion('type', [
  ...blockVariants,
  z
    .object({
      columns: z
        .array(z.array(columnBlockSchema).min(1).max(MCP_BLOCKS_PER_WRITE))
        .min(2)
        .max(MCP_COLUMNS_MAX)
        .describe('The columns from left to right, each a list of blocks.'),
      type: z.literal('columns'),
    })
    .describe('Blocks laid side by side in columns, the same width each.'),
]);

const blocksSchema = z.array(blockInputSchema).min(1).max(MCP_BLOCKS_PER_WRITE);

const blockIdsSchema = z.array(blockIdSchema).min(1).max(MCP_BLOCKS_PER_WRITE);

const placeShape = {
  after: blockIdSchema.optional().describe('Right after this block.'),
  at: z
    .enum(['start', 'end'])
    .optional()
    .describe('At the start or the end: of the page, or of the block given in inside. The end when nothing is said.'),
  before: blockIdSchema.optional().describe('Right before this block.'),
  inside: blockIdSchema
    .optional()
    .describe('Inside this block: under a list item, or in a toggle, a callout or a quote.'),
};

export const createPageInputSchema = z.object({
  blocks: blocksSchema.optional().describe('What the page says, block by block.'),
  parent: pageAddressSchema.optional().describe('Create it under this page.'),
  space: z.uuid().optional().describe('Create it at the top of this space.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH),
  ...mcpRequestIdShape,
});

export const insertBlocksInputSchema = z.object({
  blocks: blocksSchema,
  page: pageAddressSchema,
  ...placeShape,
  ...mcpRequestIdShape,
});

const blockColorSchema = z.enum(PAGE_BLOCK_COLORS).nullable().optional();

export const updateBlockInputSchema = z.object({
  backgroundColor: blockColorSchema.describe('Paint the whole block behind its words; null takes the colour off.'),
  block: blockIdSchema,
  checked: z.boolean().optional().describe('Check or uncheck a checklist item.'),
  page: pageAddressSchema,
  replacement: blockInputSchema
    .optional()
    .describe('A whole new block in its place; it keeps the id, so its discussions stay, and its colours.'),
  summary: toggleSummarySchema.optional().describe('New title for a toggle.'),
  text: inlineTextSchema
    .optional()
    .describe(
      'New words for the block, keeping what kind of block it is. In a toggle, a callout or a quote they are what it holds, split in paragraphs on blank lines.',
    ),
  textColor: blockColorSchema.describe('Paint all the words of the block; null takes the colour off.'),
});

export const deleteBlocksInputSchema = z.object({ blocks: blockIdsSchema, page: pageAddressSchema });

export const moveBlocksInputSchema = z.object({ blocks: blockIdsSchema, page: pageAddressSchema, ...placeShape });

const writtenPageSchema = z.object({ id: z.string(), title: z.string(), url: z.url() });

export const writtenBlocksOutputSchema = z.object({
  blockIds: z.array(z.string()),
  markdown: z.string(),
  page: writtenPageSchema,
});

export const createdPageOutputSchema = writtenPageSchema.extend({ markdown: z.string() });

export const updatePageInputSchema = z.object({
  icon: z
    .string()
    .trim()
    .min(1)
    .max(MCP_PAGE_ICON_MAX_LENGTH)
    .nullable()
    .optional()
    .describe('One emoji as the page icon; null takes the icon off.'),
  locked: z.boolean().optional().describe('Lock the page so nobody edits it by mistake, or unlock it.'),
  owner: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TITLE_MAX_LENGTH)
    .nullable()
    .optional()
    .describe('Who answers for the page: a person of the workspace, by name or id; null leaves it without owner.'),
  page: pageAddressSchema,
  removeCover: z.literal(true).optional().describe('Take the cover image off the page.'),
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH).optional(),
  verified: z.boolean().optional().describe('Vouch for the page as up to date, or take that back.'),
  verifiedUntil: z.iso.date().optional().describe('With verified: true, the day the vouching runs out (YYYY-MM-DD).'),
});

export const movePageInputSchema = z.object({
  page: pageAddressSchema,
  parent: pageAddressSchema.optional().describe('Move it under this page.'),
  space: z.uuid().optional().describe('Move it to the top of this space.'),
});

export const duplicatePageInputSchema = z.object({
  page: pageAddressSchema,
  title: z.string().trim().min(1).max(MCP_TITLE_MAX_LENGTH).optional().describe('The title of the copy.'),
  withChildren: z.boolean().optional().describe('Copy the pages under it too.'),
  ...mcpRequestIdShape,
});

export const trashPageInputSchema = z.object({ page: pageAddressSchema });

export const restorePageInputSchema = z.object({
  page: pageAddressSchema,
  withChildren: z
    .boolean()
    .optional()
    .describe(
      'Also bring back the pages under it that had been trashed on their own before it. The ones that went with it always come back with it.',
    ),
});

export const listTrashInputSchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TITLE_MAX_LENGTH)
    .optional()
    .describe('Only pages whose title contains this.'),
  space: z.uuid().optional().describe('Only the trash of this space.'),
});

export const listTrashOutputSchema = z.object({
  pages: z
    .array(
      z.object({
        deletedAt: z.iso.datetime(),
        deletedBy: z.object({ id: mcpIdSchema, name: z.string().max(MCP_TITLE_MAX_LENGTH) }).nullable(),
        id: mcpIdSchema,
        spaceId: mcpIdSchema,
        title: z.string().max(MCP_TITLE_MAX_LENGTH),
        trashedChildCount: z.number().int().nonnegative(),
        url: z.url(),
      }),
    )
    .max(MCP_TRASH_LISTED_MAX),
  total: z.number().int().nonnegative(),
});

export const managedPageOutputSchema = z.object({
  changed: z.array(z.string()).optional(),
  childPages: z.number().int().optional(),
  page: writtenPageSchema,
});

const tablePlaceSchema = z
  .number()
  .int()
  .min(1)
  .max(MCP_TABLE_ROWS_MAX + 1);

export const updateTableInputSchema = z.object({
  addRows: z
    .array(tableCellsSchema)
    .max(MCP_TABLE_ROWS_MAX)
    .optional()
    .describe('New rows added at the end, one list of cell texts each; missing cells stay empty.'),
  cells: z
    .array(
      z.object({
        column: tablePlaceSchema.describe('Counted from 1, left to right.'),
        row: tablePlaceSchema.describe('Counted from 1, the header being row 1, as fetch shows the table.'),
        text: inlineTextSchema,
      }),
    )
    .max(MCP_TABLE_ROWS_MAX * MCP_TABLE_COLUMNS_MAX)
    .optional()
    .describe('Cells that get new text.'),
  deleteRows: z
    .array(tablePlaceSchema)
    .max(MCP_TABLE_ROWS_MAX)
    .optional()
    .describe('Rows taken out, by number; the header, row 1, stays.'),
  page: pageAddressSchema,
  table: blockIdSchema.describe('The table block id.'),
});

export const commentOnBlockInputSchema = z.object({
  block: blockIdSchema,
  page: pageAddressSchema,
  quote: z
    .string()
    .trim()
    .min(1)
    .max(MCP_BLOCK_TEXT_MAX_LENGTH)
    .optional()
    .describe(
      'Words of the block the comment is about, as plain text without Markdown signs; they get marked. Leave it out to comment on the whole block.',
    ),
  text: z.string().trim().min(1).max(COMMENT_TEXT_MAX_LENGTH).describe('What the comment says, as plain words.'),
  ...mcpRequestIdShape,
});

export const deleteCommentInputSchema = z.object({
  block: blockIdSchema,
  comment: z.string().trim().min(1).max(MCP_ID_MAX_LENGTH).describe('The comment id, as fetch lists it.'),
  page: pageAddressSchema,
});

const discussionCommentSchema = z.object({
  author: z.string(),
  createdAt: z.string(),
  id: z.string().describe('The comment id; delete_comment takes it.'),
  isDeleted: z.boolean(),
  text: z.string(),
});

export const discussionSchema = z.object({
  blockId: z.string(),
  comments: z.array(discussionCommentSchema),
  id: z.string().describe('The discussion id; reply_to_discussion takes it.'),
  isResolved: z.boolean(),
  quote: z
    .string()
    .nullable()
    .describe('The words of the block the discussion is about; null if it is about the block.'),
});

export const commentedBlockOutputSchema = writtenBlocksOutputSchema.extend({
  comment: discussionCommentSchema.extend({ blockId: z.string(), discussionId: z.string() }),
});

export const listDiscussionsInputSchema = z.object({
  cursor: z
    .string()
    .max(MCP_ID_MAX_LENGTH * 2)
    .optional()
    .describe('The nextCursor of the previous answer, to read on.'),
  includeResolved: z
    .boolean()
    .optional()
    .describe('Also list the discussions that were marked as resolved. By default only the open ones come back.'),
  page: pageAddressSchema,
});

export const listDiscussionsOutputSchema = z.object({
  discussions: z.array(discussionSchema),
  nextCursor: z.string().optional().describe('Present when there are more discussions; pass it back as cursor.'),
  page: writtenPageSchema,
});

export const replyToDiscussionInputSchema = z.object({
  discussion: z
    .string()
    .trim()
    .min(1)
    .max(MCP_ID_MAX_LENGTH)
    .describe('The discussion id, as list_discussions or fetch lists it.'),
  text: z.string().trim().min(1).max(COMMENT_TEXT_MAX_LENGTH).describe('What the reply says, as plain words.'),
  ...mcpRequestIdShape,
});

export const repliedDiscussionOutputSchema = z.object({
  discussion: discussionSchema,
  page: writtenPageSchema,
});

export const searchDiagramIconsInputSchema = z.object({
  limit: z.number().int().min(1).max(MCP_ICON_SEARCH_MAX).default(MCP_ICON_SEARCH_DEFAULT),
  query: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TITLE_MAX_LENGTH)
    .describe(
      'What the icon shows, in English: a product or brand (aws, postgresql, kubernetes) or a thing (database, server, user).',
    ),
});

export const searchDiagramIconsOutputSchema = z.object({ icons: z.array(z.string()), usage: z.string() });

/** Parsed because the reply comes from another thread. */
export const diagramCheckAnswerSchema = z.union([
  z.object({ diagramType: z.string(), id: z.number().int() }),
  z.object({ fault: z.string(), id: z.number().int() }),
]);
