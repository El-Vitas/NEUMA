/** The first line is the block itself: identified and read by the item, not by that line. */
export const PAGE_BLOCK_ITEM_TYPES: readonly string[] = ['list_item', 'task_item'];

/** Read as a single block: inner content is not identified separately. */
export const PAGE_BLOCK_WHOLE_TYPES: readonly string[] = ['table'];

/** Blocks whose text lives in an attribute rather than in their content. */
export const PAGE_BLOCK_TEXT_ATTRIBUTES: Readonly<Partial<Record<string, string>>> = { toggle: 'summary' };

/** Attribute that supplies an inline node's readable text, by node type. */
export const PAGE_BLOCK_INLINE_TEXT_ATTRIBUTES: Readonly<Partial<Record<string, string>>> = {
  date: 'at',
  mention: 'label',
  person: 'label',
};
