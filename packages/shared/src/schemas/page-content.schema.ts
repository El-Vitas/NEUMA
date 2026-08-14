import { z } from 'zod';

export const PAGE_CONTENT_SCHEMA_VERSION = 1;
const maximumPageContentDepth = 10;
const maximumPageContentNodes = 500;
const maximumPageTextLength = 20_000;
const maximumTableRows = 50;
const maximumTableColumns = 10;
const maximumTableColumnWidth = 2_000;
const maximumToggleSummaryLength = 500;
const maximumAssetIdLength = 200;
const maximumAssetMetadataLength = 500;
const maximumEmbedUrlLength = 2_048;
const maximumBlockIdLength = 200;
const maximumMentionPageIdLength = 200;
const maximumMentionLabelLength = 200;
const maximumMentionSpaceIdLength = 200;
const maximumCommentAuthorLength = 200;
const maximumCommentBodyLength = 2_000;
const maximumCommentDateLength = 40;
const maximumCommentsPerBlock = 50;
const maximumUnknownTypeLength = 80;
const maximumBookmarkTextLength = 300;

export const PAGE_EMBED_PROVIDERS = ['figma', 'loom', 'vimeo', 'youtube'] as const;
export type PageEmbedProvider = (typeof PAGE_EMBED_PROVIDERS)[number];

/**
 * The colours a block may be painted with, kept short on purpose: a page reads
 * as one document, and every colour here is chosen to be legible on both a
 * light and a dark background.
 */
export const PAGE_BLOCK_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'red'] as const;
export type PageBlockColor = (typeof PAGE_BLOCK_COLORS)[number];

/**
 * What kind of aside a callout is.
 *
 * What is kept is the kind and not the symbol drawn for it: a page says the
 * same thing to everyone reading it, whatever each of them ends up seeing, and
 * the same few kinds mean the same few things throughout a document.
 */
export const PAGE_CALLOUT_ICONS = ['idea', 'info', 'warning', 'done', 'blocked', 'pinned'] as const;
export type PageCalloutIcon = (typeof PAGE_CALLOUT_ICONS)[number];

/**
 * The languages a code block can be said to be written in. `plain` is code
 * nobody named.
 *
 * A diagram is one of them rather than a block of its own: what is written is
 * text, kept as text, and a page that cannot draw it still holds everything
 * that was said.
 */
export const PAGE_CODE_LANGUAGES = [
  'plain',
  'bash',
  'css',
  'html',
  'mermaid',
  'java',
  'javascript',
  'json',
  'latex',
  'markdown',
  'python',
  'sql',
  'typescript',
  'yaml',
] as const;
export type PageCodeLanguage = (typeof PAGE_CODE_LANGUAGES)[number];

/**
 * What is shown of a block that draws: what was written, what it draws, or both at once.
 *
 * The drawing is what such a block is for — a diagram, a formula — so it is what
 * a page shows unless someone says otherwise; the writing is there for whoever
 * is changing it.
 */
export const PAGE_DIAGRAM_VIEWS = ['drawing', 'code', 'both'] as const;
export type PageDiagramView = (typeof PAGE_DIAGRAM_VIEWS)[number];

/** A remark left on a block, kept with the block itself so it travels wherever the block goes. */
export type PageBlockComment = {
  readonly author: string;
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
};

/** What every block carries, whatever its type: who it is, how it is painted, and what was said about it. */
export type PageBlockAttrs = {
  readonly backgroundColor?: PageBlockColor;
  readonly comments?: readonly PageBlockComment[];
  readonly id?: string;
  readonly textColor?: PageBlockColor;
};

const pageEmbedHosts: Readonly<Record<PageEmbedProvider, readonly string[]>> = {
  figma: ['figma.com', 'www.figma.com'],
  loom: ['loom.com', 'www.loom.com'],
  vimeo: ['player.vimeo.com', 'vimeo.com', 'www.vimeo.com'],
  youtube: ['www.youtube.com', 'youtu.be', 'youtube.com'],
};

export const isAllowedPageEmbedUrl = (provider: PageEmbedProvider, value: string): boolean => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && pageEmbedHosts[provider].includes(url.hostname);
};

const pageBlockIdSchema = z.string().min(1).max(maximumBlockIdLength);

const pageMarkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('strong') }).strict(),
  z.object({ type: z.literal('em') }).strict(),
  z.object({ type: z.literal('code') }).strict(),
  z
    .object({
      attrs: z
        .object({
          href: z.url().refine((url) => ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)),
        })
        .strict(),
      type: z.literal('link'),
    })
    .strict(),
  /**
   * A remark left on a fragment of the text. It carries only which remark it
   * is: what was said is kept by the block, so a fragment and a whole block are
   * commented in one place and travel together.
   */
  z.object({ attrs: z.object({ id: pageBlockIdSchema }).strict(), type: z.literal('comment') }).strict(),
]);

const pageTextSchema = z
  .object({
    marks: z.array(pageMarkSchema).max(5).optional(),
    text: z
      .string()
      .min(1)
      .max(maximumPageTextLength)
      .refine((text) => !/<\/?[a-z][^>]*>/i.test(text)),
    type: z.literal('text'),
  })
  .strict();

const pageCodeTextSchema = z
  .object({
    text: z.string().min(1).max(maximumPageTextLength),
    type: z.literal('text'),
  })
  .strict();

const pageBlockCommentSchema = z
  .object({
    author: z.string().min(1).max(maximumCommentAuthorLength),
    body: z.string().min(1).max(maximumCommentBodyLength),
    createdAt: z.string().min(1).max(maximumCommentDateLength),
    id: pageBlockIdSchema,
  })
  .strict();

/** What every block may carry, whatever its type. Block types add their own on top of these. */
const pageBlockAttrsShape = {
  backgroundColor: z.enum(PAGE_BLOCK_COLORS).optional(),
  comments: z.array(pageBlockCommentSchema).max(maximumCommentsPerBlock).optional(),
  id: pageBlockIdSchema.optional(),
  textColor: z.enum(PAGE_BLOCK_COLORS).optional(),
};

const pageIdOnlyAttrsSchema = z.object(pageBlockAttrsShape).strict();

/**
 * What a cell of a table carries beyond what it says: how far it reaches, and
 * how wide its column was left. The widths are kept per cell because that is
 * where a table records them when a column is stretched.
 */
const pageTableCellAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    colspan: z.number().int().min(1).max(maximumTableColumns).optional(),
    colwidth: z
      .array(z.number().int().min(1).max(maximumTableColumnWidth))
      .max(maximumTableColumns)
      .nullable()
      .optional(),
    rowspan: z.number().int().min(1).max(maximumTableRows).optional(),
  })
  .strict();

export type PageTableCellAttrs = PageBlockAttrs & {
  readonly colspan?: number;
  readonly colwidth?: readonly number[] | null;
  readonly rowspan?: number;
};

export const pageCollectionAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    pageId: z.string().min(1).max(maximumMentionPageIdLength),
    spaceId: z.string().min(1).max(maximumMentionSpaceIdLength),
    viewName: z.string().min(1).max(maximumMentionLabelLength).optional(),
  })
  .strict();

export const pageMentionAttrsSchema = z
  .object({
    label: z.string().min(1).max(maximumMentionLabelLength),
    pageId: z.string().min(1).max(maximumMentionPageIdLength),
    spaceId: z.string().min(1).max(maximumMentionSpaceIdLength),
  })
  .strict();

const pageMentionSchema = z
  .object({
    attrs: pageMentionAttrsSchema,
    type: z.literal('mention'),
  })
  .strict();

/** A line broken on purpose inside a block, without starting another one. */
const pageHardBreakSchema = z.object({ type: z.literal('hard_break') }).strict();

const pageInlineNodeSchema = z.discriminatedUnion('type', [pageTextSchema, pageMentionSchema, pageHardBreakSchema]);

export const pageAssetAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    alt: z.string().max(maximumAssetMetadataLength).optional(),
    assetId: z.string().min(1).max(maximumAssetIdLength),
    caption: z.string().max(maximumAssetMetadataLength).optional(),
  })
  .strict();

/**
 * Where a block that is not writing — an image, a player — stands on the line
 * it occupies, and how much of the width it takes. A page reads as one column,
 * so such a block says how it stands in that column rather than carrying a size
 * in pixels that no other screen would honour.
 */
export const PAGE_BLOCK_ALIGNMENTS = ['left', 'center', 'right', 'full'] as const;
export type PageBlockAlignment = (typeof PAGE_BLOCK_ALIGNMENTS)[number];

/**
 * What a page says about a file it is holding.
 *
 * The kind of file and how heavy it is are kept on the block rather than looked
 * up: an asset never changes once uploaded, and a page that describes what it
 * holds can be read without asking anyone else.
 *
 * A file the page shows in place — a document, read where it stands — is placed
 * and sized like anything else that is not writing.
 */
/**
 * How a page shows a file it is holding: read where it stands, or named on one
 * line that brings it down.
 *
 * It is the block that says so and not the kind of file, because the same
 * document is a thing to read on one page and a thing to keep on another, and
 * nobody should have to upload it twice to say which.
 */
export const PAGE_FILE_DISPLAYS = ['document', 'line'] as const;
export type PageFileDisplay = (typeof PAGE_FILE_DISPLAYS)[number];

export const pageFileAttrsSchema = pageAssetAttrsSchema
  .extend({
    align: z.enum(PAGE_BLOCK_ALIGNMENTS).optional(),
    display: z.enum(PAGE_FILE_DISPLAYS).optional(),
    mimeType: z.string().min(1).max(maximumAssetMetadataLength).optional(),
    size: z.number().int().min(0).optional(),
    width: z.number().gt(0).lte(1).optional(),
  })
  .strict();

/**
 * A video kept on the page: how much of the width it takes, said as a share of
 * the page for the same reason an image does — a size in pixels is a size on
 * one screen only. A recording is sized the same way: what is drawn is the row
 * of controls it is worked by, and a row of controls has a width.
 */
export const pageMediaAttrsSchema = pageAssetAttrsSchema
  .extend({
    align: z.enum(PAGE_BLOCK_ALIGNMENTS).optional(),
    width: z.number().gt(0).lte(1).optional(),
  })
  .strict();

export const pageImageAttrsSchema = pageAssetAttrsSchema
  .extend({
    align: z.enum(PAGE_BLOCK_ALIGNMENTS).optional(),
    width: z.number().gt(0).lte(1).optional(),
  })
  .strict();

/**
 * A link kept on the page as a card: what it is called, what it says about
 * itself, and the mark the site is known by.
 *
 * What was read from the link is written down rather than looked up again: a
 * page has to read the same tomorrow, and the site it points at may be gone by
 * then — a card that keeps its title still says what was linked.
 */
export const pageBookmarkAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    description: z.string().max(maximumBookmarkTextLength).optional(),
    icon: z.url().max(maximumEmbedUrlLength).optional(),
    title: z.string().max(maximumBookmarkTextLength).optional(),
    url: z.url().max(maximumEmbedUrlLength),
  })
  .strict();

export const pageEmbedAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    align: z.enum(PAGE_BLOCK_ALIGNMENTS).optional(),
    provider: z.enum(PAGE_EMBED_PROVIDERS),
    url: z.url().max(maximumEmbedUrlLength),
    width: z.number().gt(0).lte(1).optional(),
  })
  .strict()
  .superRefine((attrs, context) => {
    if (!isAllowedPageEmbedUrl(attrs.provider, attrs.url)) {
      context.addIssue({ code: 'custom', message: 'Embed URL is not allowed', path: ['url'] });
    }
  });

type PageMark =
  | { readonly type: 'strong' }
  | { readonly type: 'em' }
  | { readonly type: 'code' }
  | { readonly attrs: { readonly href: string }; readonly type: 'link' }
  | { readonly attrs: { readonly id: string }; readonly type: 'comment' };

export type PageContentText = { readonly marks?: readonly PageMark[]; readonly text: string; readonly type: 'text' };

export type PageContentMention = {
  readonly attrs: z.infer<typeof pageMentionAttrsSchema>;
  readonly type: 'mention';
};

export type PageContentHardBreak = { readonly type: 'hard_break' };

export type PageContentInlineNode = PageContentText | PageContentMention | PageContentHardBreak;

type PageBlockNode<Type extends string, Content> = {
  readonly attrs?: PageBlockAttrs;
  readonly content: readonly Content[];
  readonly type: Type;
};

/**
 * Anything a page may hold, said in the only shape a page is stored in. A block
 * this version does not know is kept as such: readable as JSON, never read into.
 */
export type PageContentJson =
  | string
  | number
  | boolean
  | null
  | readonly PageContentJson[]
  | { readonly [key: string]: PageContentJson };

/** A block written by a version that knows more than this one: kept as it arrived, and never read into. */
export type PageContentUnknownNode = {
  readonly attrs?: { readonly [key: string]: PageContentJson };
  readonly content?: readonly PageContentJson[];
  readonly type: string;
};

export type PageContentKnownNode =
  | PageBlockNode<'paragraph', PageContentInlineNode>
  | {
      readonly attrs: PageBlockAttrs & { readonly collapsed?: boolean; readonly level: number };
      readonly content: readonly PageContentInlineNode[];
      readonly type: 'heading';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'bullet_list';
    }
  | {
      readonly attrs?: PageBlockAttrs & { readonly order: number };
      readonly content: readonly PageContentNode[];
      readonly type: 'ordered_list';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'list_item';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'task_list';
    }
  | {
      readonly attrs?: PageBlockAttrs & { readonly checked?: boolean };
      readonly content: readonly PageContentNode[];
      readonly type: 'task_item';
    }
  | {
      readonly attrs?: PageBlockAttrs & { readonly icon?: PageCalloutIcon };
      readonly content: readonly PageContentNode[];
      readonly type: 'callout';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'blockquote';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'nested_block';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'block_children';
    }
  | {
      readonly attrs?: PageBlockAttrs & { readonly language?: PageCodeLanguage; readonly wrapped?: boolean };
      readonly content: readonly PageContentText[];
      readonly type: 'code_block';
    }
  | { readonly attrs?: PageBlockAttrs; readonly content: readonly PageContentNode[]; readonly type: 'table' }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'table_row';
    }
  | {
      readonly attrs?: PageTableCellAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'table_cell';
    }
  | {
      readonly attrs?: PageTableCellAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'table_header';
    }
  | {
      readonly attrs?: PageBlockAttrs;
      readonly content: readonly PageContentNode[];
      readonly type: 'column_list';
    }
  | {
      readonly attrs?: PageBlockAttrs & { readonly width?: number };
      readonly content: readonly PageContentNode[];
      readonly type: 'column';
    }
  | {
      readonly attrs: PageBlockAttrs & { readonly open?: boolean; readonly summary: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'toggle';
    }
  | { readonly attrs?: PageBlockAttrs; readonly type: 'divider' }
  | { readonly attrs: z.infer<typeof pageImageAttrsSchema>; readonly type: 'image' }
  | { readonly attrs: z.infer<typeof pageMediaAttrsSchema>; readonly type: 'video' }
  | { readonly attrs: z.infer<typeof pageMediaAttrsSchema>; readonly type: 'audio' }
  | { readonly attrs: z.infer<typeof pageFileAttrsSchema>; readonly type: 'file' }
  | { readonly attrs: z.infer<typeof pageBookmarkAttrsSchema>; readonly type: 'bookmark' }
  | { readonly attrs: z.infer<typeof pageEmbedAttrsSchema>; readonly type: 'embed' }
  | { readonly attrs: z.infer<typeof pageCollectionAttrsSchema>; readonly type: 'collection' };

export type PageContentNode = PageContentKnownNode | PageContentUnknownNode;

/** Every block type this version knows how to read. What is not here is kept as it arrived. */
export const PAGE_CONTENT_NODE_TYPES: readonly string[] = [
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'list_item',
  'task_list',
  'task_item',
  'callout',
  'blockquote',
  'nested_block',
  'block_children',
  'code_block',
  'table',
  'table_row',
  'table_cell',
  'table_header',
  'toggle',
  'column_list',
  'column',
  'audio',
  'divider',
  'image',
  'video',
  'file',
  'bookmark',
  'embed',
  'collection',
  'text',
  'mention',
  'hard_break',
];

const pageKnownNodeSchema: z.ZodType<PageContentKnownNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: z.array(pageInlineNodeSchema),
        type: z.literal('paragraph'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({
            ...pageBlockAttrsShape,
            collapsed: z.boolean().optional(),
            level: z.number().int().min(1).max(3),
          })
          .strict(),
        content: z.array(pageInlineNodeSchema),
        type: z.literal('heading'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('bullet_list'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({ ...pageBlockAttrsShape, order: z.number().int().min(1).max(1000) })
          .strict()
          .optional(),
        content: pageNodeListSchema,
        type: z.literal('ordered_list'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('list_item'),
      })
      .strict(),
    z
      .object({ attrs: pageIdOnlyAttrsSchema.optional(), content: pageNodeListSchema, type: z.literal('task_list') })
      .strict(),
    z
      .object({
        attrs: z
          .object({ ...pageBlockAttrsShape, checked: z.boolean().optional() })
          .strict()
          .optional(),
        content: pageNodeListSchema,
        type: z.literal('task_item'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({ ...pageBlockAttrsShape, icon: z.enum(PAGE_CALLOUT_ICONS).optional() })
          .strict()
          .optional(),
        content: pageNodeListSchema,
        type: z.literal('callout'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('blockquote'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('nested_block'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('block_children'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({
            ...pageBlockAttrsShape,
            language: z.enum(PAGE_CODE_LANGUAGES).optional(),
            shown: z.enum(PAGE_DIAGRAM_VIEWS).optional(),
            wrapped: z.boolean().optional(),
          })
          .strict()
          .optional(),
        content: z.array(pageCodeTextSchema),
        type: z.literal('code_block'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema.max(maximumTableRows),
        type: z.literal('table'),
      })
      .strict(),
    z
      .object({
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema.max(maximumTableColumns),
        type: z.literal('table_row'),
      })
      .strict(),
    z
      .object({
        attrs: pageTableCellAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('table_cell'),
      })
      .strict(),
    z
      .object({
        attrs: pageTableCellAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('table_header'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({
            ...pageBlockAttrsShape,
            open: z.boolean().optional(),
            summary: z.string().max(maximumToggleSummaryLength),
          })
          .strict(),
        content: pageNodeListSchema,
        type: z.literal('toggle'),
      })
      .strict(),
    z
      .object({ attrs: pageIdOnlyAttrsSchema.optional(), content: pageNodeListSchema, type: z.literal('column_list') })
      .strict(),
    z
      .object({
        attrs: z
          .object({ ...pageBlockAttrsShape, width: z.number().gt(0).lte(1).optional() })
          .strict()
          .optional(),
        content: pageNodeListSchema,
        type: z.literal('column'),
      })
      .strict(),
    z.object({ attrs: pageIdOnlyAttrsSchema.optional(), type: z.literal('divider') }).strict(),
    z.object({ attrs: pageImageAttrsSchema, type: z.literal('image') }).strict(),
    z.object({ attrs: pageMediaAttrsSchema, type: z.literal('video') }).strict(),
    z.object({ attrs: pageMediaAttrsSchema, type: z.literal('audio') }).strict(),
    z.object({ attrs: pageFileAttrsSchema, type: z.literal('file') }).strict(),
    z.object({ attrs: pageBookmarkAttrsSchema, type: z.literal('bookmark') }).strict(),
    z.object({ attrs: pageEmbedAttrsSchema, type: z.literal('embed') }).strict(),
    z.object({ attrs: pageCollectionAttrsSchema, type: z.literal('collection') }).strict(),
  ]),
);

/**
 * A block written by a version that knows more than this one.
 *
 * It is kept exactly as it arrived — nobody here can read it, so nobody here
 * may rewrite it — and it is kept inert: what it holds is never looked into,
 * and whoever draws the page shows a placeholder rather than its contents. A
 * block this version does know stays out of here even when it is malformed:
 * being wrong is not the same as being new.
 */
const pageJsonSchema: z.ZodType<PageContentJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(pageJsonSchema),
    z.record(z.string(), pageJsonSchema),
  ]),
);

const pageUnknownNodeSchema = z
  .object({
    attrs: z.record(z.string(), pageJsonSchema).optional(),
    content: z.array(pageJsonSchema).max(maximumPageContentNodes).optional(),
    type: z
      .string()
      .min(1)
      .max(maximumUnknownTypeLength)
      .refine((name) => !PAGE_CONTENT_NODE_TYPES.includes(name)),
  })
  .strict();

const pageNodeSchema: z.ZodType<PageContentNode> = z.union([pageKnownNodeSchema, pageUnknownNodeSchema]);

const pageNodeListSchema = z.array(pageNodeSchema).min(1);

/** What this version can read into. A block it does not know counts as one thing and is not opened. */
export const isKnownPageContentNode = (node: { readonly type: string }): node is PageContentKnownNode =>
  PAGE_CONTENT_NODE_TYPES.includes(node.type);

const countPageContentNodes = (nodes: readonly PageContentNode[], depth: number): { depth: number; nodes: number } => {
  return nodes.reduce(
    (totals, node) => {
      if (!isKnownPageContentNode(node)) return { depth: totals.depth, nodes: totals.nodes + 1 };
      if (!('content' in node)) return { depth: totals.depth, nodes: totals.nodes + 1 };
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block')
        return { depth: totals.depth, nodes: totals.nodes + node.content.length + 1 };
      const childTotals = countPageContentNodes(node.content, depth + 1);
      return {
        depth: Math.max(totals.depth, childTotals.depth),
        nodes: totals.nodes + childTotals.nodes + 1,
      };
    },
    { depth, nodes: nodes.length },
  );
};

type PageBlockParentType = Extract<
  PageContentKnownNode['type'],
  | 'block_children'
  | 'blockquote'
  | 'bullet_list'
  | 'list_item'
  | 'nested_block'
  | 'ordered_list'
  | 'table'
  | 'table_cell'
  | 'table_header'
  | 'table_row'
  | 'toggle'
  | 'column_list'
  | 'column'
  | 'task_list'
  | 'task_item'
  | 'callout'
>;

const pageFlowChildTypes: readonly PageContentKnownNode['type'][] = [
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'task_list',
  'blockquote',
  'callout',
  'code_block',
];

const pageContainerChildTypes: readonly PageContentKnownNode['type'][] = [
  ...pageFlowChildTypes,
  'table',
  'toggle',
  'audio',
  'divider',
  'image',
  'video',
  'file',
  'bookmark',
  'embed',
  'collection',
  'nested_block',
  'column_list',
];

const pageNestedBlockChildTypes: readonly PageContentKnownNode['type'][] = [
  ...pageContainerChildTypes,
  'block_children',
];

const pageBlockParentChildTypes: Readonly<Record<PageBlockParentType, readonly PageContentKnownNode['type'][]>> = {
  block_children: pageContainerChildTypes,
  blockquote: pageFlowChildTypes,
  bullet_list: ['list_item'],
  nested_block: pageNestedBlockChildTypes,
  list_item: pageContainerChildTypes,
  ordered_list: ['list_item'],
  table: ['table_row'],
  table_cell: pageContainerChildTypes,
  table_header: pageContainerChildTypes,
  table_row: ['table_cell', 'table_header'],
  toggle: pageContainerChildTypes,
  task_list: ['task_item'],
  task_item: pageContainerChildTypes,
  callout: pageContainerChildTypes,
  column_list: ['column'],
  column: pageContainerChildTypes,
};

/**
 * Whether a block of one kind may hold a block of another.
 *
 * Asked before writing rather than after: the editor is free to draw more than
 * a page may keep, and a block put where the page cannot keep it is only found
 * out when the page fails to save.
 */
export const canPageBlockHold = (parent: string, child: string): boolean =>
  parent in pageBlockParentChildTypes
    ? pageBlockParentChildTypes[parent as PageBlockParentType].some((allowed) => allowed === child)
    : true;

const validateBlockChildren = (
  nodes: readonly PageContentNode[],
  allowedTypes: readonly string[],
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  nodes.forEach((node, index) => {
    /** A block this version does not know is kept wherever it was written, since nothing here can judge it. */
    if (!isKnownPageContentNode(node)) return;
    if (allowedTypes.includes(node.type)) return;
    context.addIssue({
      code: 'custom',
      message: `Node type ${node.type} is not valid here`,
      path: [...path, index, 'type'],
    });
  });
};

const validateNestedBlockShape = (
  nodes: readonly PageContentNode[],
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  if (nodes.length !== 2 || nodes[0]?.type === 'block_children' || nodes[1]?.type !== 'block_children') {
    context.addIssue({
      code: 'custom',
      message: 'A nested block must hold exactly one block followed by its children',
      path: [...path, 'content'],
    });
  }
};

/**
 * Whether a block is one that holds other blocks.
 *
 * What a paragraph or a heading holds is writing, not blocks, and a line or an
 * image holds nothing at all. Asked as a question about the block rather than
 * read off its shape, a block arriving with content it could never hold — which
 * the contract refuses anyway — is left alone instead of being read into.
 */
const holdsOtherBlocks = (
  node: PageContentKnownNode,
): node is Extract<PageContentKnownNode, { readonly type: PageBlockParentType }> =>
  node.type in pageBlockParentChildTypes;

const validatePageNodeNesting = (
  node: PageContentNode,
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  if (!isKnownPageContentNode(node)) return;
  if (!holdsOtherBlocks(node)) return;

  const allowedTypes = pageBlockParentChildTypes[node.type];
  if (node.type === 'list_item' && node.content[0]?.type !== 'paragraph') {
    context.addIssue({
      code: 'custom',
      message: 'A list item must start with a paragraph',
      path: [...path, 'content', 0, 'type'],
    });
  }
  if (node.type === 'nested_block') validateNestedBlockShape(node.content, path, context);
  validateBlockChildren(node.content, allowedTypes, [...path, 'content'], context);
  node.content.forEach((child, index) => {
    validatePageNodeNesting(child, [...path, 'content', index], context);
  });
};

/**
 * The persisted contract is ProseMirror JSON with `schemaVersion` metadata on
 * the root document, rather than an envelope around the ProseMirror node.
 */
export const pageContentSchema = z
  .object({
    content: pageNodeListSchema,
    schemaVersion: z.literal(PAGE_CONTENT_SCHEMA_VERSION),
    type: z.literal('doc'),
  })
  .strict()
  .superRefine((document, context) => {
    const totals = countPageContentNodes(document.content, 1);
    if (totals.depth > maximumPageContentDepth) {
      context.addIssue({ code: 'custom', message: 'Page content exceeds the maximum depth', path: ['content'] });
    }
    if (totals.nodes > maximumPageContentNodes) {
      context.addIssue({ code: 'custom', message: 'Page content exceeds the maximum node count', path: ['content'] });
    }
    document.content.forEach((node, index) => {
      validatePageNodeNesting(node, ['content', index], context);
    });
  });

export type PageContent = z.infer<typeof pageContentSchema>;
