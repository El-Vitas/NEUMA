/** Written only when true, so pages saved before the attribute existed read the same. */
export const PAGE_DOCUMENT_ONLY_WHEN_TRUE_ATTRIBUTES: readonly string[] = ['collapsed', 'wrapped'];

/** Written only above 1: a span of one is the default, and writing it would change every saved table. */
export const PAGE_DOCUMENT_ONLY_WHEN_BEYOND_ONE_ATTRIBUTES: readonly string[] = ['colspan', 'rowspan'];

/** A list only holds its own kind of item. */
export const PAGE_DOCUMENT_LIST_ITEMS: Readonly<Partial<Record<string, string>>> = {
  bullet_list: 'list_item',
  ordered_list: 'list_item',
  task_list: 'task_item',
};

export const PAGE_DOCUMENT_BLOCK_HOLDERS: readonly string[] = [
  'blockquote',
  'bullet_list',
  'callout',
  'column',
  'list_item',
  'ordered_list',
  'task_item',
  'task_list',
  'toggle',
];

/** What remains when a page is emptied, as in the editor. */
export const PAGE_DOCUMENT_EMPTY_PARAGRAPH = { content: [], type: 'paragraph' } as const;
