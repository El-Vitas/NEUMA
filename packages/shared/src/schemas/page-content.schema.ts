import { z } from 'zod';

const pageContentSchemaVersion = 1;
const maximumPageContentDepth = 10;
const maximumPageContentNodes = 500;
const maximumPageTextLength = 20_000;
const maximumTableRows = 50;
const maximumTableColumns = 10;
const maximumToggleSummaryLength = 500;
const maximumAssetIdLength = 200;
const maximumAssetMetadataLength = 500;
const maximumEmbedUrlLength = 2_048;

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

export const pageAssetAttrsSchema = z
  .object({
    alt: z.string().max(maximumAssetMetadataLength).optional(),
    assetId: z.string().min(1).max(maximumAssetIdLength),
    caption: z.string().max(maximumAssetMetadataLength).optional(),
  })
  .strict();

export const pageEmbedAttrsSchema = z
  .object({
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

export type PageContentNode =
  | { readonly content: readonly PageContentText[]; readonly type: 'paragraph' }
  | {
      readonly attrs: { readonly level: number };
      readonly content: readonly PageContentText[];
      readonly type: 'heading';
    }
  | { readonly content: readonly PageContentNode[]; readonly type: 'bullet_list' }
  | {
      readonly attrs?: { readonly order: number };
      readonly content: readonly PageContentNode[];
      readonly type: 'ordered_list';
    }
  | { readonly content: readonly PageContentNode[]; readonly type: 'list_item' }
  | { readonly content: readonly PageContentNode[]; readonly type: 'blockquote' }
  | { readonly content: readonly PageContentText[]; readonly type: 'code_block' }
  | { readonly content: readonly PageContentNode[]; readonly type: 'table' }
  | { readonly content: readonly PageContentNode[]; readonly type: 'table_row' }
  | { readonly content: readonly PageContentNode[]; readonly type: 'table_cell' }
  | {
      readonly attrs: { readonly summary: string };
      readonly content: readonly PageContentNode[];
      readonly type: 'toggle';
    }
  | { readonly attrs: z.infer<typeof pageAssetAttrsSchema>; readonly type: 'image' }
  | { readonly attrs: z.infer<typeof pageAssetAttrsSchema>; readonly type: 'file' }
  | { readonly attrs: z.infer<typeof pageEmbedAttrsSchema>; readonly type: 'embed' };

const pageNodeSchema: z.ZodType<PageContentNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z
      .object({
        content: z.array(pageTextSchema),
        type: z.literal('paragraph'),
      })
      .strict(),
    z
      .object({
        attrs: z.object({ level: z.number().int().min(1).max(3) }).strict(),
        content: z.array(pageTextSchema),
        type: z.literal('heading'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageNodeSchema).min(1),
        type: z.literal('bullet_list'),
      })
      .strict(),
    z
      .object({
        attrs: z
          .object({ order: z.number().int().min(1).max(1000) })
          .strict()
          .optional(),
        content: z.array(pageNodeSchema).min(1),
        type: z.literal('ordered_list'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageNodeSchema).min(1),
        type: z.literal('list_item'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageNodeSchema).min(1),
        type: z.literal('blockquote'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageCodeTextSchema),
        type: z.literal('code_block'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageNodeSchema).min(1).max(maximumTableRows),
        type: z.literal('table'),
      })
      .strict(),
    z
      .object({
        content: z.array(pageNodeSchema).min(1).max(maximumTableColumns),
        type: z.literal('table_row'),
      })
      .strict(),
    z.object({ content: z.array(pageNodeSchema).min(1), type: z.literal('table_cell') }).strict(),
    z
      .object({
        attrs: z.object({ summary: z.string().min(1).max(maximumToggleSummaryLength) }).strict(),
        content: z.array(pageNodeSchema).min(1),
        type: z.literal('toggle'),
      })
      .strict(),
    z.object({ attrs: pageAssetAttrsSchema, type: z.literal('image') }).strict(),
    z.object({ attrs: pageAssetAttrsSchema, type: z.literal('file') }).strict(),
    z.object({ attrs: pageEmbedAttrsSchema, type: z.literal('embed') }).strict(),
  ]),
);

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
  'blockquote' | 'bullet_list' | 'list_item' | 'ordered_list' | 'table' | 'table_cell' | 'table_row' | 'toggle'
>;

const pageFlowChildTypes: readonly PageContentNode['type'][] = [
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'blockquote',
  'code_block',
];

const pageContainerChildTypes: readonly PageContentNode['type'][] = [
  ...pageFlowChildTypes,
  'table',
  'toggle',
  'image',
  'file',
  'embed',
];

const pageBlockParentChildTypes: Readonly<Record<PageBlockParentType, readonly PageContentNode['type'][]>> = {
  blockquote: pageFlowChildTypes,
  bullet_list: ['list_item'],
  list_item: pageContainerChildTypes,
  ordered_list: ['list_item'],
  table: ['table_row'],
  table_cell: pageContainerChildTypes,
  table_row: ['table_cell'],
  toggle: pageContainerChildTypes,
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
    content: z.array(pageNodeSchema).min(1),
    schemaVersion: z.literal(pageContentSchemaVersion),
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
