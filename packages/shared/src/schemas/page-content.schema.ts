import { z } from 'zod';

const pageContentSchemaVersion = 1;
const maximumPageContentDepth = 10;
const maximumPageContentNodes = 500;
const maximumPageTextLength = 20_000;

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
  | { readonly content: readonly PageContentText[]; readonly type: 'code_block' };

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
  ]),
);

const countPageContentNodes = (nodes: readonly PageContentNode[], depth: number): { depth: number; nodes: number } => {
  return nodes.reduce(
    (totals, node) => {
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block') {
        return { depth: totals.depth, nodes: totals.nodes + node.content.length };
      }
      const childTotals = countPageContentNodes(node.content, depth + 1);
      return {
        depth: Math.max(totals.depth, childTotals.depth),
        nodes: totals.nodes + childTotals.nodes,
      };
    },
    { depth, nodes: nodes.length },
  );
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

  const allowedTypes: readonly PageContentNode['type'][] =
    node.type === 'bullet_list' || node.type === 'ordered_list'
      ? ['list_item']
      : node.type === 'list_item'
        ? ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'blockquote', 'code_block']
        : ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'blockquote', 'code_block'];
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
