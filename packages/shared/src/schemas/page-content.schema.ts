import { z } from 'zod';
import { isOneOf } from '../value-list.lib.js';

export const PAGE_CONTENT_SCHEMA_VERSION = 1;
const maximumPageContentDepth = 10;
export const maximumPageContentNodes = 500;
export const minimumHeadingLevel = 1;
export const maximumHeadingLevel = 3;
export const maximumOrderedListOrder = 1000;
/** Limits that writers outside the editor must respect before sending. */
export const maximumPageTextLength = 20_000;
export const maximumTableRows = 50;
export const maximumTableColumns = 10;
export const maximumTableColumnWidth = 2_000;
export const maximumToggleSummaryLength = 500;
const maximumAssetIdLength = 200;
const maximumAssetMetadataLength = 500;
const maximumEmbedUrlLength = 2_048;
const maximumBlockIdLength = 200;
const maximumMentionPageIdLength = 200;
const maximumMentionLabelLength = 200;
const maximumMentionSpaceIdLength = 200;
const maximumPersonLabelLength = 200;
export const maximumFormulaLatexLength = 4_000;
const maximumCommentAuthorLength = 200;
const maximumCommentDateLength = 40;

/** Exported so writers know the comment length and per-block count limits up front. */
export const PAGE_BLOCK_COMMENT_BODY_MOST = 2000;
export const PAGE_BLOCK_COMMENTS_MOST = 50;
const maximumUnknownTypeLength = 80;
/** Far beyond any real block, far short of the stack. */
const maximumUnknownJsonDepth = 32;
export const maximumBookmarkTextLength = 300;

export const PAGE_EMBED_PROVIDERS = ['figma', 'loom', 'vimeo', 'youtube'] as const;
export type PageEmbedProvider = (typeof PAGE_EMBED_PROVIDERS)[number];

export const PAGE_LINK_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:'];

/** A leading double slash leads to another site while looking like an app path. */
const PAGE_LINK_PROTOCOL_RELATIVE_PATTERN = /^[/\\]{2}/;

/** Browsers strip tabs and newlines before parsing, so "/\t/evil.site" becomes "//evil.site". */
const PAGE_LINK_CONTROL_CHARACTERS = /\p{Cc}/u;

/** An app path or an address with one of the allowed protocols. */
export const isPageLinkTarget = (href: string): boolean => {
  const trimmed = href.trim();
  if (PAGE_LINK_CONTROL_CHARACTERS.test(trimmed)) return false;
  if (PAGE_LINK_PROTOCOL_RELATIVE_PATTERN.test(trimmed)) return false;
  if (trimmed.startsWith('/')) return true;
  if (!URL.canParse(trimmed)) return false;
  return PAGE_LINK_PROTOCOLS.includes(new URL(trimmed).protocol);
};

/** Kept short on purpose; each color is legible on both light and dark backgrounds. */
export const PAGE_BLOCK_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'red'] as const;
export type PageBlockColor = (typeof PAGE_BLOCK_COLORS)[number];

/** The kind is stored, not the drawn symbol, so every reader gets the same meaning. */
export const PAGE_CALLOUT_ICONS = ['idea', 'info', 'warning', 'done', 'blocked', 'pinned'] as const;
export type PageCalloutIcon = (typeof PAGE_CALLOUT_ICONS)[number];

/** `plain` is unnamed code. A diagram is a language, not its own block, so its text survives undrawn. */
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

export const PAGE_DIAGRAM_LANGUAGE = 'mermaid' satisfies PageCodeLanguage;

export const PAGE_FORMULA_LANGUAGE = 'latex' satisfies PageCodeLanguage;

/** The drawing is the point of such a block, so it is shown unless someone asks for the source. */
export const PAGE_DIAGRAM_VIEWS = ['drawing', 'code', 'both'] as const;
export type PageDiagramView = (typeof PAGE_DIAGRAM_VIEWS)[number];

/** Pixels: high enough to show something, no taller than a tall screen. */
export const PAGE_DIAGRAM_FRAME_HEIGHT_LEAST = 120;
export const PAGE_DIAGRAM_FRAME_HEIGHT_MOST = 2400;

export const PAGE_BUTTON_DEEDS = ['blocks', 'row'] as const;
export type PageButtonDeed = (typeof PAGE_BUTTON_DEEDS)[number];

export const PAGE_BUTTON_PLACES = ['below', 'top', 'bottom'] as const;
export type PageButtonPlace = (typeof PAGE_BUTTON_PLACES)[number];

/** Stored on the block so it travels wherever the block goes. */
export type PageBlockComment = {
  readonly author: string;
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
};

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

export const pageBlockIdSchema = z.string().min(1).max(maximumBlockIdLength);

const pageMarkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('strong') }).strict(),
  z.object({ type: z.literal('em') }).strict(),
  z.object({ type: z.literal('code') }).strict(),
  z.object({ type: z.literal('strike') }).strict(),
  z.object({ attrs: z.object({ color: z.enum(PAGE_BLOCK_COLORS) }).strict(), type: z.literal('text_color') }).strict(),
  z
    .object({ attrs: z.object({ color: z.enum(PAGE_BLOCK_COLORS) }).strict(), type: z.literal('background_color') })
    .strict(),
  z.object({ type: z.literal('underline') }).strict(),
  z
    .object({
      attrs: z.object({ href: z.string().refine(isPageLinkTarget) }).strict(),
      type: z.literal('link'),
    })
    .strict(),
  // Carries only the comment id; the body lives on the block so fragment and block comments share one place.
  z.object({ attrs: z.object({ id: pageBlockIdSchema }).strict(), type: z.literal('comment') }).strict(),
]);

/** Pages never store HTML tags, so markup cannot ride in as text. */
export const PAGE_TEXT_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

export const PAGE_TEXT_MARKS_MOST = 5;

const pageTextSchema = z
  .object({
    marks: z.array(pageMarkSchema).max(PAGE_TEXT_MARKS_MOST).optional(),
    text: z
      .string()
      .min(1)
      .max(maximumPageTextLength)
      .refine((text) => !PAGE_TEXT_TAG_PATTERN.test(text)),
    type: z.literal('text'),
  })
  .strict();

const pageCodeTextSchema = z
  .object({
    text: z.string().min(1).max(maximumPageTextLength),
    type: z.literal('text'),
  })
  .strict();

export const pageBlockCommentSchema = z
  .object({
    author: z.string().min(1).max(maximumCommentAuthorLength),
    body: z.string().min(1).max(PAGE_BLOCK_COMMENT_BODY_MOST),
    createdAt: z.string().min(1).max(maximumCommentDateLength),
    id: pageBlockIdSchema,
  })
  .strict();

export const isPageBlockComment = (value: unknown): value is PageBlockComment =>
  pageBlockCommentSchema.safeParse(value).success;

const pageBlockAttrsShape = {
  backgroundColor: z.enum(PAGE_BLOCK_COLORS).optional(),
  comments: z.array(pageBlockCommentSchema).max(PAGE_BLOCK_COMMENTS_MOST).optional(),
  id: pageBlockIdSchema.optional(),
  textColor: z.enum(PAGE_BLOCK_COLORS).optional(),
};

const pageIdOnlyAttrsSchema = z.object(pageBlockAttrsShape).strict();

// Column widths are stored per cell because that is where a table records them when a column is stretched.
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

/** `label` is the name at mention time. */
export const pagePersonAttrsSchema = z
  .object({
    label: z.string().min(1).max(maximumPersonLabelLength),
    userId: z.uuid(),
  })
  .strict();

const pageCalendarDayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Rejects impossible days such as 2026-02-30 that merely match the shape. */
export const isPageCalendarDay = (value: string): boolean => {
  const match = pageCalendarDayPattern.exec(value);
  if (match === null) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const pageDateAttrsSchema = z
  .object({
    at: z.string().refine(isPageCalendarDay),
  })
  .strict();

/** Empty `latex` means a formula not written yet. */
export const pageFormulaAttrsSchema = z
  .object({
    latex: z.string().max(maximumFormulaLatexLength),
  })
  .strict();

export const pageButtonAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    deed: z.enum(PAGE_BUTTON_DEEDS).optional(),
    label: z.string().min(1).max(maximumMentionLabelLength),
    pageId: z.string().min(1).max(maximumMentionPageIdLength).optional(),
    place: z.enum(PAGE_BUTTON_PLACES).optional(),
    spaceId: z.string().min(1).max(maximumMentionSpaceIdLength).optional(),
    /** The template of the collection a row is made from; left out, the default one (ADR 027). */
    templateId: z.string().min(1).max(maximumMentionPageIdLength).optional(),
  })
  .strict();

/** Stores only the source page and block, so what is read here is what is written there at read time. */
export const pageSyncedAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    blockId: pageBlockIdSchema,
    pageId: z.string().min(1).max(maximumMentionPageIdLength),
    spaceId: z.string().min(1).max(maximumMentionSpaceIdLength),
  })
  .strict();

/** `label` is kept only so an unreadable child page still shows something instead of an empty line. */
export const pageSubpageAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
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

const pagePersonSchema = z
  .object({
    attrs: pagePersonAttrsSchema,
    type: z.literal('person'),
  })
  .strict();

const pageDateSchema = z
  .object({
    attrs: pageDateAttrsSchema,
    type: z.literal('date'),
  })
  .strict();

const pageFormulaSchema = z
  .object({
    attrs: pageFormulaAttrsSchema,
    type: z.literal('formula'),
  })
  .strict();

const pageHardBreakSchema = z.object({ type: z.literal('hard_break') }).strict();

const pageInlineNodeSchema = z.discriminatedUnion('type', [
  pageTextSchema,
  pageMentionSchema,
  pagePersonSchema,
  pageDateSchema,
  pageFormulaSchema,
  pageHardBreakSchema,
]);

export const pageAssetAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    alt: z.string().max(maximumAssetMetadataLength).optional(),
    assetId: z.string().min(1).max(maximumAssetIdLength),
    caption: z.string().max(maximumAssetMetadataLength).optional(),
  })
  .strict();

/** Non-text blocks (image, player) are placed and sized relative to the single page column, not in pixels. */
export const PAGE_BLOCK_ALIGNMENTS = ['left', 'center', 'right', 'full'] as const;
export type PageBlockAlignment = (typeof PAGE_BLOCK_ALIGNMENTS)[number];

/** Chosen per block, not per file type: one document can be read in place on a page and downloaded on another. */
export const PAGE_FILE_DISPLAYS = ['document', 'line'] as const;
export type PageFileDisplay = (typeof PAGE_FILE_DISPLAYS)[number];

// Kind and size are stored on the block: an asset never changes after upload, so the page reads without a lookup.
export const pageFileAttrsSchema = pageAssetAttrsSchema
  .extend({
    align: z.enum(PAGE_BLOCK_ALIGNMENTS).optional(),
    display: z.enum(PAGE_FILE_DISPLAYS).optional(),
    mimeType: z.string().min(1).max(maximumAssetMetadataLength).optional(),
    size: z.number().int().min(0).optional(),
    width: z.number().gt(0).lte(1).optional(),
  })
  .strict();

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

/** Only http(s): a card opens on click, so `javascript:` and `data:` are refused. */
const pageWebAddressSchema = z.url({ protocol: /^https?$/ }).max(maximumEmbedUrlLength);

/** Live-connection content skips the stored schema, so this is checked again where a card is drawn. */
export const isPageWebAddress = (value: unknown): value is string => pageWebAddressSchema.safeParse(value).success;

/** Link metadata is stored, not re-fetched: the page must read the same later even if the site is gone. */
export const pageBookmarkAttrsSchema = z
  .object({
    ...pageBlockAttrsShape,
    description: z.string().max(maximumBookmarkTextLength).optional(),
    icon: pageWebAddressSchema.optional(),
    title: z.string().max(maximumBookmarkTextLength).optional(),
    url: pageWebAddressSchema,
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

export type PageMark =
  | { readonly type: 'strong' }
  | { readonly type: 'em' }
  | { readonly type: 'code' }
  | { readonly type: 'strike' }
  | { readonly attrs: { readonly color: PageBlockColor }; readonly type: 'text_color' }
  | { readonly attrs: { readonly color: PageBlockColor }; readonly type: 'background_color' }
  | { readonly type: 'underline' }
  | { readonly attrs: { readonly href: string }; readonly type: 'link' }
  | { readonly attrs: { readonly id: string }; readonly type: 'comment' };

export type PageContentText = { readonly marks?: readonly PageMark[]; readonly text: string; readonly type: 'text' };

export type PageContentMention = {
  readonly attrs: z.infer<typeof pageMentionAttrsSchema>;
  readonly type: 'mention';
};

export type PageContentPerson = {
  readonly attrs: z.infer<typeof pagePersonAttrsSchema>;
  readonly type: 'person';
};

export type PageContentDate = {
  readonly attrs: z.infer<typeof pageDateAttrsSchema>;
  readonly type: 'date';
};

export type PageContentFormula = {
  readonly attrs: z.infer<typeof pageFormulaAttrsSchema>;
  readonly type: 'formula';
};

export type PageContentHardBreak = { readonly type: 'hard_break' };

export type PageContentInlineNode =
  | PageContentText
  | PageContentMention
  | PageContentPerson
  | PageContentDate
  | PageContentFormula
  | PageContentHardBreak;

type PageBlockNode<Type extends string, Content> = {
  readonly attrs?: PageBlockAttrs;
  readonly content: readonly Content[];
  readonly type: Type;
};

/** An unknown block is kept as readable JSON and never read into. */
export type PageContentJson =
  | string
  | number
  | boolean
  | null
  | readonly PageContentJson[]
  | { readonly [key: string]: PageContentJson };

/** Written by a newer version: kept as it arrived. */
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
      readonly attrs?: PageBlockAttrs & {
        readonly frameHeight?: number;
        readonly language?: PageCodeLanguage;
        readonly wrapped?: boolean;
      };
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
  | { readonly attrs?: PageBlockAttrs; readonly type: 'table_of_contents' }
  | { readonly attrs: z.infer<typeof pageSubpageAttrsSchema>; readonly type: 'subpage' }
  | { readonly attrs: z.infer<typeof pageSyncedAttrsSchema>; readonly type: 'synced' }
  | {
      readonly attrs: z.infer<typeof pageButtonAttrsSchema>;
      readonly content: readonly PageContentNode[];
      readonly type: 'button';
    }
  | { readonly attrs: z.infer<typeof pageImageAttrsSchema>; readonly type: 'image' }
  | { readonly attrs: z.infer<typeof pageMediaAttrsSchema>; readonly type: 'video' }
  | { readonly attrs: z.infer<typeof pageMediaAttrsSchema>; readonly type: 'audio' }
  | { readonly attrs: z.infer<typeof pageFileAttrsSchema>; readonly type: 'file' }
  | { readonly attrs: z.infer<typeof pageBookmarkAttrsSchema>; readonly type: 'bookmark' }
  | { readonly attrs: z.infer<typeof pageEmbedAttrsSchema>; readonly type: 'embed' }
  | { readonly attrs: z.infer<typeof pageCollectionAttrsSchema>; readonly type: 'collection' };

export type PageContentNode = PageContentKnownNode | PageContentUnknownNode;

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
  'table_of_contents',
  'subpage',
  'synced',
  'button',
  'image',
  'video',
  'file',
  'bookmark',
  'embed',
  'collection',
  'text',
  'mention',
  'person',
  'date',
  'formula',
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
            level: z.number().int().min(minimumHeadingLevel).max(maximumHeadingLevel),
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
          .object({ ...pageBlockAttrsShape, order: z.number().int().min(1).max(maximumOrderedListOrder) })
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
            frameHeight: z
              .number()
              .int()
              .min(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST)
              .max(PAGE_DIAGRAM_FRAME_HEIGHT_MOST)
              .optional(),
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
    z.object({ attrs: pageIdOnlyAttrsSchema.optional(), type: z.literal('table_of_contents') }).strict(),
    z.object({ attrs: pageSubpageAttrsSchema, type: z.literal('subpage') }).strict(),
    z.object({ attrs: pageSyncedAttrsSchema, type: z.literal('synced') }).strict(),
    z.object({ attrs: pageButtonAttrsSchema, content: pageNodeListSchema, type: z.literal('button') }).strict(),
    z.object({ attrs: pageImageAttrsSchema, type: z.literal('image') }).strict(),
    z.object({ attrs: pageMediaAttrsSchema, type: z.literal('video') }).strict(),
    z.object({ attrs: pageMediaAttrsSchema, type: z.literal('audio') }).strict(),
    z.object({ attrs: pageFileAttrsSchema, type: z.literal('file') }).strict(),
    z.object({ attrs: pageBookmarkAttrsSchema, type: z.literal('bookmark') }).strict(),
    z.object({ attrs: pageEmbedAttrsSchema, type: z.literal('embed') }).strict(),
    z.object({ attrs: pageCollectionAttrsSchema, type: z.literal('collection') }).strict(),
  ]),
);

const readPageJsonChildren = (value: unknown): readonly unknown[] | null =>
  typeof value === 'object' && value !== null ? Object.values(value) : null;

const isPageJsonLeaf = (value: unknown): boolean =>
  value === null ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.length <= maximumPageTextLength);

/** Iterative, so thousands of nested levels are refused instead of exhausting the stack. */
const isBoundedPageJson = (value: unknown): value is PageContentJson => {
  const pending = [{ depth: 0, value }];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const children = readPageJsonChildren(next.value);
    if (children === null && !isPageJsonLeaf(next.value)) return false;
    if (children !== null && next.depth >= maximumUnknownJsonDepth) return false;
    for (const child of children ?? []) pending.push({ depth: next.depth + 1, value: child });
  }
  return true;
};

const pageJsonSchema = z.custom<PageContentJson>(isBoundedPageJson, {
  message: 'Unknown block holds something nested too deep, or a text too long',
});

// Kept inert as it arrived. A known type is excluded even when malformed: being wrong is not being new.
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
  | 'button'
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
  'table_of_contents',
  'subpage',
  'synced',
  'button',
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
  button: pageContainerChildTypes,
  callout: pageContainerChildTypes,
  column_list: ['column'],
  column: pageContainerChildTypes,
};

/** Asked before writing: the editor can draw more than a page may keep, which would otherwise fail at save. */
export const canPageBlockHold = (parent: string, child: string): boolean =>
  parent in pageBlockParentChildTypes ? isOneOf(pageBlockParentChildTypes[parent as PageBlockParentType], child) : true;

const validateBlockChildren = (
  nodes: readonly PageContentNode[],
  allowedTypes: readonly string[],
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  nodes.forEach((node, index) => {
    // Unknown blocks are kept wherever they were written; nothing here can judge them.
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

// Decided by block type, not by shape: content a block could never hold is left to the contract to refuse.
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

/** ProseMirror JSON with `schemaVersion` on the root document, not an envelope around the node. */
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
