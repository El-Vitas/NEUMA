import { z } from 'zod';

export const PAGE_CONTENT_SCHEMA_VERSION = 1;
const maximumPageContentDepth = 10;
const maximumPageContentNodes = 500;
const maximumPageTextLength = 20_000;
const maximumTableRows = 50;
const maximumTableColumns = 10;
const maximumToggleSummaryLength = 500;
const maximumAssetIdLength = 200;
const maximumAssetMetadataLength = 500;
const maximumEmbedUrlLength = 2_048;
const maximumBlockIdLength = 200;
const maximumMentionPageIdLength = 200;
const maximumMentionLabelLength = 200;
const maximumMentionSpaceIdLength = 200;

export const PAGE_EMBED_PROVIDERS = ['figma', 'loom', 'vimeo', 'youtube'] as const;
export type PageEmbedProvider = (typeof PAGE_EMBED_PROVIDERS)[number];

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
]);

const pageTextSchema = z
  .object({
    marks: z.array(pageMarkSchema).max(4).optional(),
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

const pageBlockIdSchema = z.string().min(1).max(maximumBlockIdLength);

const pageIdOnlyAttrsSchema = z.object({ id: pageBlockIdSchema.optional() }).strict();

export const pageCollectionAttrsSchema = z
  .object({
    id: pageBlockIdSchema.optional(),
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

const pageInlineNodeSchema = z.discriminatedUnion('type', [pageTextSchema, pageMentionSchema]);

export const pageAssetAttrsSchema = z
  .object({
    alt: z.string().max(maximumAssetMetadataLength).optional(),
    assetId: z.string().min(1).max(maximumAssetIdLength),
    caption: z.string().max(maximumAssetMetadataLength).optional(),
    id: pageBlockIdSchema.optional(),
  })
  .strict();

export const pageEmbedAttrsSchema = z
  .object({
    id: pageBlockIdSchema.optional(),
    provider: z.enum(PAGE_EMBED_PROVIDERS),
    url: z.url().max(maximumEmbedUrlLength),
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
  | { readonly attrs: { readonly href: string }; readonly type: 'link' };

export type PageContentText = { readonly marks?: readonly PageMark[]; readonly text: string; readonly type: 'text' };

export type PageContentMention = {
  readonly attrs: z.infer<typeof pageMentionAttrsSchema>;
  readonly type: 'mention';
};

export type PageContentInlineNode = PageContentText | PageContentMention;

type PageBlockNode<Type extends string, Content> = {
  readonly attrs?: { readonly id?: string };
  readonly content: readonly Content[];
  readonly type: Type;
};

export type PageContentNode =
  | PageBlockNode<'paragraph', PageContentInlineNode>
  | {
      readonly attrs: { readonly id?: string; readonly level: number };
      readonly content: readonly PageContentInlineNode[];
      readonly type: 'heading';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'bullet_list';
    }
  | {
      readonly attrs?: { readonly id?: string; readonly order: number };
      readonly content: readonly PageContentNode[];
      readonly type: 'ordered_list';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'list_item';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'task_list';
    }
  | {
      readonly attrs?: { readonly checked?: boolean; readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'task_item';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'callout';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'blockquote';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'nested_block';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'block_children';
    }
  | PageBlockNode<'code_block', PageContentText>
  | { readonly attrs?: { readonly id?: string }; readonly content: readonly PageContentNode[]; readonly type: 'table' }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'table_row';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'table_cell';
    }
  | {
      readonly attrs?: { readonly id?: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'column_list';
    }
  | {
      readonly attrs?: { readonly id?: string; readonly width?: number };
      readonly content: readonly PageContentNode[];
      readonly type: 'column';
    }
  | {
      readonly attrs: { readonly id?: string; readonly open?: boolean; readonly summary: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'toggle';
    }
  | { readonly attrs: z.infer<typeof pageAssetAttrsSchema>; readonly type: 'image' }
  | { readonly attrs: z.infer<typeof pageAssetAttrsSchema>; readonly type: 'file' }
  | { readonly attrs: z.infer<typeof pageEmbedAttrsSchema>; readonly type: 'embed' }
  | { readonly attrs: z.infer<typeof pageCollectionAttrsSchema>; readonly type: 'collection' };

const pageNodeSchema: z.ZodType<PageContentNode> = z.lazy(() =>
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
        attrs: z.object({ id: pageBlockIdSchema.optional(), level: z.number().int().min(1).max(3) }).strict(),
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
          .object({ id: pageBlockIdSchema.optional(), order: z.number().int().min(1).max(1000) })
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
        attrs: z.object({ checked: z.boolean().optional(), id: pageBlockIdSchema.optional() }).strict().optional(),
        content: pageNodeListSchema,
        type: z.literal('task_item'),
      })
      .strict(),
    z
      .object({ attrs: pageIdOnlyAttrsSchema.optional(), content: pageNodeListSchema, type: z.literal('callout') })
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
        attrs: pageIdOnlyAttrsSchema.optional(),
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
        attrs: pageIdOnlyAttrsSchema.optional(),
        content: pageNodeListSchema,
        type: z.literal('table_cell'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({
            id: pageBlockIdSchema.optional(),
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
          .object({ id: pageBlockIdSchema.optional(), width: z.number().gt(0).lte(1).optional() })
          .strict()
          .optional(),
        content: pageNodeListSchema,
        type: z.literal('column'),
      })
      .strict(),
    z.object({ attrs: pageAssetAttrsSchema, type: z.literal('image') }).strict(),
    z.object({ attrs: pageAssetAttrsSchema, type: z.literal('file') }).strict(),
    z.object({ attrs: pageEmbedAttrsSchema, type: z.literal('embed') }).strict(),
    z.object({ attrs: pageCollectionAttrsSchema, type: z.literal('collection') }).strict(),
  ]),
);

const pageNodeListSchema = z.array(pageNodeSchema).min(1);

const countPageContentNodes = (nodes: readonly PageContentNode[], depth: number): { depth: number; nodes: number } => {
  return nodes.reduce(
    (totals, node) => {
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
  PageContentNode['type'],
  | 'block_children'
  | 'blockquote'
  | 'bullet_list'
  | 'list_item'
  | 'nested_block'
  | 'ordered_list'
  | 'table'
  | 'table_cell'
  | 'table_row'
  | 'toggle'
  | 'column_list'
  | 'column'
  | 'task_list'
  | 'task_item'
  | 'callout'
>;

const pageFlowChildTypes: readonly PageContentNode['type'][] = [
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'task_list',
  'blockquote',
  'callout',
  'code_block',
];

const pageContainerChildTypes: readonly PageContentNode['type'][] = [
  ...pageFlowChildTypes,
  'table',
  'toggle',
  'image',
  'file',
  'embed',
  'collection',
  'nested_block',
  'column_list',
];

const pageNestedBlockChildTypes: readonly PageContentNode['type'][] = [...pageContainerChildTypes, 'block_children'];

const pageBlockParentChildTypes: Readonly<Record<PageBlockParentType, readonly PageContentNode['type'][]>> = {
  block_children: pageContainerChildTypes,
  blockquote: pageFlowChildTypes,
  bullet_list: ['list_item'],
  nested_block: pageNestedBlockChildTypes,
  list_item: pageContainerChildTypes,
  ordered_list: ['list_item'],
  table: ['table_row'],
  table_cell: pageContainerChildTypes,
  table_row: ['table_cell'],
  toggle: pageContainerChildTypes,
  task_list: ['task_item'],
  task_item: pageContainerChildTypes,
  callout: pageContainerChildTypes,
  column_list: ['column'],
  column: pageContainerChildTypes,
};

const validateBlockChildren = (
  nodes: readonly PageContentNode[],
  allowedTypes: readonly PageContentNode['type'][],
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  nodes.forEach((node, index) => {
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

const validatePageNodeNesting = (
  node: PageContentNode,
  path: readonly (number | string)[],
  context: z.RefinementCtx,
): void => {
  if (!('content' in node) || node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block')
    return;

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
