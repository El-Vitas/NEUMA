import { z } from 'zod';
import { PAGE_PROPERTY_KEY_MAX_LENGTH } from '../page-property/page-property.key.constants.js';
import {
  PAGE_BLOCK_COLORS,
  PAGE_BLOCK_COMMENTS_MOST,
  PAGE_BUTTON_DEEDS,
  PAGE_BUTTON_PLACES,
  PAGE_CALLOUT_ICONS,
  PAGE_CODE_LANGUAGES,
  PAGE_CONTENT_NODE_TYPES,
  PAGE_CONTENT_SCHEMA_VERSION,
  PAGE_DIAGRAM_FRAME_HEIGHT_LEAST,
  PAGE_DIAGRAM_FRAME_HEIGHT_MOST,
  PAGE_DIAGRAM_VIEWS,
  PAGE_FILE_DISPLAYS,
  isAllowedPageEmbedUrl,
  maximumHeadingLevel,
  maximumOrderedListOrder,
  maximumPageTextLength,
  maximumTableColumnWidth,
  maximumTableColumns,
  maximumTableRows,
  maximumToggleSummaryLength,
  minimumHeadingLevel,
  pageAssetAttrsSchema,
  pageBlockCommentSchema,
  pageBookmarkAttrsSchema,
  pageButtonAttrsSchema,
  pageCollectionAttrsSchema,
  pageContentSchema,
  pageEmbedAttrsSchema,
  pageFileAttrsSchema,
  pageMediaAttrsSchema,
  pageSubpageAttrsSchema,
  pageSyncedAttrsSchema,
} from '../schemas/page-content.schema.js';
import type { PageContentUnknownNode } from '../schemas/page-content.schema.js';
import { pageCoverValueSchema } from '../schemas/page-cover.schema.js';
import { pageIconSchema } from '../schemas/page-icon.schema.js';
import { PAGE_TITLE_MAX_LENGTH } from '../types/page.types.js';
import { blockPlainTextSchema, blockRichTextSchema } from './block-text.schemas.js';
import { extractPlainText } from './block-text.lib.js';
import { BLOCK_TYPE } from './block-type.constants.js';

const emptySchema = z.object({}).strict();

const annotationShape = {
  backgroundColor: z.enum(PAGE_BLOCK_COLORS).optional(),
  comments: z.array(pageBlockCommentSchema).max(PAGE_BLOCK_COMMENTS_MOST).optional(),
  textColor: z.enum(PAGE_BLOCK_COLORS).optional(),
};

/** Every block can be colored and commented, as every node of the document was. */
const withAnnotations = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.object({ ...annotationShape, ...shape }).strict();

const annotationsOnlySchema = withAnnotations({});

const titleOnlySchema = z.object({ title: blockRichTextSchema }).strict();

const titleSummaryIsShortEnough = (properties: { readonly title: z.infer<typeof blockRichTextSchema> }): boolean =>
  extractPlainText(properties.title).length <= maximumToggleSummaryLength;

const isPreservableUnknownNode = (value: unknown): value is PageContentUnknownNode => {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  if (typeof value.type !== 'string' || PAGE_CONTENT_NODE_TYPES.includes(value.type)) return false;
  return pageContentSchema.safeParse({ content: [value], schemaVersion: PAGE_CONTENT_SCHEMA_VERSION, type: 'doc' })
    .success;
};

const unsupportedNodeSchema = z.custom<PageContentUnknownNode>(isPreservableUnknownNode, {
  message: 'The node must keep the shape an unknown node has in a page document',
});

const pagePropertyValueSchema = z.union([
  z.string().max(maximumPageTextLength),
  z.number(),
  z.boolean(),
  z.array(z.string().max(maximumPageTextLength)),
]);

const pageTitleIsShortEnough = (properties: { readonly title: z.infer<typeof blockPlainTextSchema> }): boolean =>
  extractPlainText(properties.title).length <= PAGE_TITLE_MAX_LENGTH;

const embedProperties = z
  .object({ provider: pageEmbedAttrsSchema.shape.provider, url: pageEmbedAttrsSchema.shape.url })
  .strict()
  .superRefine((properties, context) => {
    if (!isAllowedPageEmbedUrl(properties.provider, properties.url)) {
      context.addIssue({ code: 'custom', message: 'Embed URL is not allowed', path: ['url'] });
    }
  });

const assetProperties = {
  alt: pageAssetAttrsSchema.shape.alt,
  assetId: pageAssetAttrsSchema.shape.assetId,
  caption: pageAssetAttrsSchema.shape.caption,
};

const framedFormat = {
  align: pageMediaAttrsSchema.shape.align,
  width: pageMediaAttrsSchema.shape.width,
};

const linkedBlockProperties = {
  pageId: pageSyncedAttrsSchema.shape.pageId,
  spaceId: pageSyncedAttrsSchema.shape.spaceId,
};

interface BlockContentSchemaPair {
  readonly format: z.ZodType;
  readonly properties: z.ZodType;
}

/** Properties hold what the block says; format holds how it is shown. */
export const BLOCK_CONTENT_SCHEMAS = {
  [BLOCK_TYPE.page]: {
    format: z.object({ cover: pageCoverValueSchema.optional(), icon: pageIconSchema.optional() }).strict(),
    properties: z
      .object({
        title: blockPlainTextSchema,
        values: z.record(z.string().min(1).max(PAGE_PROPERTY_KEY_MAX_LENGTH), pagePropertyValueSchema).optional(),
      })
      .strict()
      .refine(pageTitleIsShortEnough, { message: 'The page title is too long', path: ['title'] }),
  },
  [BLOCK_TYPE.paragraph]: { format: annotationsOnlySchema, properties: titleOnlySchema },
  [BLOCK_TYPE.heading]: {
    format: withAnnotations({ collapsed: z.boolean().optional() }),
    properties: z
      .object({
        level: z.number().int().min(minimumHeadingLevel).max(maximumHeadingLevel),
        title: blockRichTextSchema,
      })
      .strict(),
  },
  [BLOCK_TYPE.bulletedListItem]: { format: annotationsOnlySchema, properties: titleOnlySchema },
  [BLOCK_TYPE.numberedListItem]: {
    format: withAnnotations({ start: z.number().int().min(1).max(maximumOrderedListOrder).optional() }),
    properties: titleOnlySchema,
  },
  [BLOCK_TYPE.toDo]: {
    format: annotationsOnlySchema,
    properties: z.object({ checked: z.boolean().optional(), title: blockRichTextSchema }).strict(),
  },
  [BLOCK_TYPE.blockquote]: { format: annotationsOnlySchema, properties: emptySchema },
  [BLOCK_TYPE.callout]: {
    format: withAnnotations({ icon: z.enum(PAGE_CALLOUT_ICONS).optional() }),
    properties: emptySchema,
  },
  [BLOCK_TYPE.codeBlock]: {
    format: withAnnotations({
      frameHeight: z.number().int().min(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST).max(PAGE_DIAGRAM_FRAME_HEIGHT_MOST).optional(),
      shown: z.enum(PAGE_DIAGRAM_VIEWS).optional(),
      wrapped: z.boolean().optional(),
    }),
    properties: z.object({ language: z.enum(PAGE_CODE_LANGUAGES).optional(), title: blockPlainTextSchema }).strict(),
  },
  [BLOCK_TYPE.divider]: { format: annotationsOnlySchema, properties: emptySchema },
  [BLOCK_TYPE.toggle]: {
    format: withAnnotations({ open: z.boolean().optional() }),
    properties: titleOnlySchema.refine(titleSummaryIsShortEnough, {
      message: 'The toggle title is too long',
      path: ['title'],
    }),
  },
  [BLOCK_TYPE.image]: {
    format: withAnnotations(framedFormat),
    properties: z.object(assetProperties).strict(),
  },
  [BLOCK_TYPE.video]: {
    format: withAnnotations(framedFormat),
    properties: z.object(assetProperties).strict(),
  },
  [BLOCK_TYPE.audio]: {
    format: withAnnotations(framedFormat),
    properties: z.object(assetProperties).strict(),
  },
  [BLOCK_TYPE.file]: {
    format: withAnnotations({ ...framedFormat, display: z.enum(PAGE_FILE_DISPLAYS).optional() }),
    properties: z
      .object({
        ...assetProperties,
        mimeType: pageFileAttrsSchema.shape.mimeType,
        size: pageFileAttrsSchema.shape.size,
      })
      .strict(),
  },
  [BLOCK_TYPE.bookmark]: {
    format: annotationsOnlySchema,
    properties: z
      .object({
        description: pageBookmarkAttrsSchema.shape.description,
        icon: pageBookmarkAttrsSchema.shape.icon,
        title: pageBookmarkAttrsSchema.shape.title,
        url: pageBookmarkAttrsSchema.shape.url,
      })
      .strict(),
  },
  [BLOCK_TYPE.embed]: {
    format: withAnnotations({ align: pageEmbedAttrsSchema.shape.align, width: pageEmbedAttrsSchema.shape.width }),
    properties: embedProperties,
  },
  [BLOCK_TYPE.button]: {
    format: annotationsOnlySchema,
    properties: z
      .object({
        deed: z.enum(PAGE_BUTTON_DEEDS).optional(),
        label: pageButtonAttrsSchema.shape.label,
        pageId: pageButtonAttrsSchema.shape.pageId,
        place: z.enum(PAGE_BUTTON_PLACES).optional(),
        spaceId: pageButtonAttrsSchema.shape.spaceId,
      })
      .strict(),
  },
  [BLOCK_TYPE.tableOfContents]: { format: annotationsOnlySchema, properties: emptySchema },
  [BLOCK_TYPE.synced]: {
    format: annotationsOnlySchema,
    properties: z.object({ ...linkedBlockProperties, blockId: pageSyncedAttrsSchema.shape.blockId }).strict(),
  },
  [BLOCK_TYPE.subpage]: {
    format: annotationsOnlySchema,
    properties: z.object({ ...linkedBlockProperties, label: pageSubpageAttrsSchema.shape.label }).strict(),
  },
  [BLOCK_TYPE.collection]: {
    format: annotationsOnlySchema,
    properties: z.object({ ...linkedBlockProperties, viewName: pageCollectionAttrsSchema.shape.viewName }).strict(),
  },
  [BLOCK_TYPE.table]: {
    format: withAnnotations({ hasHeaderColumn: z.boolean().optional(), hasHeaderRow: z.boolean().optional() }),
    properties: emptySchema,
  },
  [BLOCK_TYPE.tableRow]: { format: annotationsOnlySchema, properties: emptySchema },
  [BLOCK_TYPE.tableCell]: {
    format: withAnnotations({
      colwidth: z
        .array(z.number().int().min(1).max(maximumTableColumnWidth))
        .max(maximumTableColumns)
        .nullable()
        .optional(),
    }),
    properties: z
      .object({
        colspan: z.number().int().min(1).max(maximumTableColumns).optional(),
        isHeader: z.boolean().optional(),
        rowspan: z.number().int().min(1).max(maximumTableRows).optional(),
      })
      .strict(),
  },
  [BLOCK_TYPE.columnList]: { format: annotationsOnlySchema, properties: emptySchema },
  [BLOCK_TYPE.column]: {
    format: withAnnotations({ width: pageMediaAttrsSchema.shape.width }),
    properties: emptySchema,
  },
  [BLOCK_TYPE.unsupported]: {
    format: z.object({}).strict(),
    properties: z.object({ node: unsupportedNodeSchema }).strict(),
  },
} as const satisfies Record<(typeof BLOCK_TYPE)[keyof typeof BLOCK_TYPE], BlockContentSchemaPair>;

const describeBlockContent = <Type extends string, Properties extends z.ZodType, Format extends z.ZodType>(
  type: Type,
  schemas: { readonly format: Format; readonly properties: Properties },
) => z.object({ format: schemas.format, properties: schemas.properties, type: z.literal(type) }).strict();

/** One entry per block type; a test keeps it in step with `BLOCK_CONTENT_SCHEMAS`. */
export const blockContentSchema = z.discriminatedUnion('type', [
  describeBlockContent(BLOCK_TYPE.page, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.page]),
  describeBlockContent(BLOCK_TYPE.paragraph, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.paragraph]),
  describeBlockContent(BLOCK_TYPE.heading, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.heading]),
  describeBlockContent(BLOCK_TYPE.bulletedListItem, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.bulletedListItem]),
  describeBlockContent(BLOCK_TYPE.numberedListItem, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.numberedListItem]),
  describeBlockContent(BLOCK_TYPE.toDo, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.toDo]),
  describeBlockContent(BLOCK_TYPE.blockquote, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.blockquote]),
  describeBlockContent(BLOCK_TYPE.callout, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.callout]),
  describeBlockContent(BLOCK_TYPE.codeBlock, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.codeBlock]),
  describeBlockContent(BLOCK_TYPE.divider, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.divider]),
  describeBlockContent(BLOCK_TYPE.toggle, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.toggle]),
  describeBlockContent(BLOCK_TYPE.image, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.image]),
  describeBlockContent(BLOCK_TYPE.video, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.video]),
  describeBlockContent(BLOCK_TYPE.audio, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.audio]),
  describeBlockContent(BLOCK_TYPE.file, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.file]),
  describeBlockContent(BLOCK_TYPE.bookmark, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.bookmark]),
  describeBlockContent(BLOCK_TYPE.embed, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.embed]),
  describeBlockContent(BLOCK_TYPE.button, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.button]),
  describeBlockContent(BLOCK_TYPE.tableOfContents, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.tableOfContents]),
  describeBlockContent(BLOCK_TYPE.synced, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.synced]),
  describeBlockContent(BLOCK_TYPE.subpage, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.subpage]),
  describeBlockContent(BLOCK_TYPE.collection, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.collection]),
  describeBlockContent(BLOCK_TYPE.table, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.table]),
  describeBlockContent(BLOCK_TYPE.tableRow, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.tableRow]),
  describeBlockContent(BLOCK_TYPE.tableCell, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.tableCell]),
  describeBlockContent(BLOCK_TYPE.columnList, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.columnList]),
  describeBlockContent(BLOCK_TYPE.column, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.column]),
  describeBlockContent(BLOCK_TYPE.unsupported, BLOCK_CONTENT_SCHEMAS[BLOCK_TYPE.unsupported]),
]);
