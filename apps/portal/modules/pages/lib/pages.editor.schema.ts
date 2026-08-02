import type { Node as EditorNode, NodeSpec } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';

const pageEditorNodeEntries: readonly (readonly [string, NodeSpec])[] = [
  [
    'blockquote',
    { content: 'block+', group: 'block', parseDOM: [{ tag: 'blockquote' }], toDOM: () => ['blockquote', 0] },
  ],
  ['bullet_list', { content: 'list_item+', group: 'block', parseDOM: [{ tag: 'ul' }], toDOM: () => ['ul', 0] }],
  [
    'code_block',
    {
      code: true,
      content: 'text*',
      group: 'block',
      marks: '',
      parseDOM: [{ preserveWhitespace: 'full', tag: 'pre' }],
      toDOM: () => ['pre', ['code', 0]],
    },
  ],
  ['doc', { content: 'block+' }],
  [
    'heading',
    {
      attrs: { level: { default: 1 } },
      content: 'inline*',
      defining: true,
      group: 'block',
      parseDOM: [
        { attrs: { level: 1 }, tag: 'h1' },
        { attrs: { level: 2 }, tag: 'h2' },
        { attrs: { level: 3 }, tag: 'h3' },
      ],
      toDOM: (node: EditorNode) => [`h${node.attrs.level}`, 0],
    },
  ],
  ['list_item', { content: 'paragraph block*', defining: true, parseDOM: [{ tag: 'li' }], toDOM: () => ['li', 0] }],
  [
    'ordered_list',
    {
      attrs: { order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        { getAttrs: (element: Element) => ({ order: Number(element.getAttribute('start')) || 1 }), tag: 'ol' },
      ],
      toDOM: (node: EditorNode) => ['ol', node.attrs.order === 1 ? {} : { start: node.attrs.order }, 0],
    },
  ],
  ['paragraph', { content: 'inline*', group: 'block', parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0] }],
  ['text', { group: 'inline' }],
];

const pageEditorNodes: Readonly<Record<string, NodeSpec>> = Object.fromEntries(pageEditorNodeEntries);
const pageEditorLinkProtocols = new Set(['http:', 'https:', 'mailto:']);

const getPageEditorLinkAttrs = (element: Element): { readonly href: string } | false => {
  const href = element.getAttribute('href');
  if (href === null || !URL.canParse(href)) return false;

  const protocol = new URL(href).protocol;
  if (!pageEditorLinkProtocols.has(protocol)) return false;
  return { href };
};

export const pageEditorSchema = new Schema({
  marks: {
    code: {},
    em: {},
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [{ getAttrs: getPageEditorLinkAttrs, tag: 'a[href]' }],
      toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
    },
    strong: {},
  },
  nodes: pageEditorNodes,
});
