export const PAGE_EDITOR_HEADING_INPUT_PATTERN = /^(#{1,3})\s$/;
export const PAGE_EDITOR_BULLET_LIST_INPUT_PATTERN = /^\s*([-+*])\s$/;
export const PAGE_EDITOR_ORDERED_LIST_INPUT_PATTERN = /^\s*(\d+)\.\s$/;
export const PAGE_EDITOR_TASK_LIST_INPUT_PATTERN = /^\s*\[ ?\]\s$/;
export const PAGE_EDITOR_BLOCKQUOTE_INPUT_PATTERN = /^\s*>\s$/;
export const PAGE_EDITOR_DIVIDER_INPUT_PATTERN = /^---$/;
export const PAGE_EDITOR_CODE_BLOCK_INPUT_PATTERN = /^```(\w+)?\s$/;
export const PAGE_EDITOR_LINK_INPUT_PATTERN = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)$/;
export const PAGE_EDITOR_BOLD_INPUT_PATTERN = /\*\*([^*]+)\*\*$/;
/** One asterisk, and not the second of a pair: `**` is bold and must not be read as italic twice. */
export const PAGE_EDITOR_ITALIC_INPUT_PATTERN = /(?<!\*)\*([^*]+)\*$/;
export const PAGE_EDITOR_CODE_INPUT_PATTERN = /`([^`]+)`$/;
export const PAGE_EDITOR_STRIKE_INPUT_PATTERN = /~~([^~]+)~~$/;
