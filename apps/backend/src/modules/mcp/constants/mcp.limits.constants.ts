import {
  maximumBookmarkTextLength,
  maximumFormulaLatexLength,
  maximumPageTextLength,
  maximumTableColumns,
  maximumTableRows,
  maximumToggleSummaryLength,
} from '@company-brain/shared';

/** Fine matching is left to the blocks. */
export const MCP_SEARCH_PAGE_TITLE_LIMIT = 5;

export const MCP_FETCH_BACKLINK_LIMIT = 20;

/** A longer page continues in the next part: returning it whole would eat the agent's context. */
export const MCP_FETCH_PART_MAX_CHARACTERS = 60_000;

export const MCP_FETCH_COMMENT_LIMIT = 200;

/** Children beyond this are reached with list_pages. */
export const MCP_FETCH_CHILD_LIMIT = 100;

export const MCP_BLOCK_TYPE_MAX_LENGTH = 64;

/** Hundreds of root pages in one response exceed what the agent accepts from a tool, and it loses all of them. */
export const MCP_LISTED_PAGE_PART_DEFAULT = 50;
export const MCP_LISTED_PAGE_PART_MAX = 200;

export const MCP_COLLECTION_CHANGE_LIMIT = 50;

export const MCP_WHERE_CONDITION_LIMIT = 20;
export const MCP_SORT_RULE_LIMIT = 5;

export const MCP_COLUMN_NAME_MAX_LENGTH = 100;

export const MCP_VALUE_TEXT_MAX_LENGTH = 500;

export const MCP_ROW_TEXT_MAX_LENGTH = 20_000;

export const MCP_LISTED_PAGE_LIMIT = 1000;

export const MCP_LISTED_SPACE_LIMIT = 1000;

/** To find a page among more, search by title. */
export const MCP_TRASH_LISTED_MAX = 50;

export const MCP_PATH_MAX_DEPTH = 64;

export const MCP_ADDRESS_MAX_LENGTH = 2048;

export const MCP_REQUEST_ID_MAX_LENGTH = 128;

export const MCP_TITLE_MAX_LENGTH = 200;

export const MCP_BOOKMARK_TEXT_MAX_LENGTH = maximumBookmarkTextLength;

/** More do not fit across a page. */
export const MCP_COLUMNS_MAX = 4;

export const MCP_PAGE_ICON_MAX_LENGTH = 16;

export const MCP_BLOCKS_PER_WRITE = 100;

export const MCP_BLOCK_TEXT_MAX_LENGTH = maximumPageTextLength;

/** Start covers loading all of Mermaid. Past a timeout the worker is deemed dead and restarted. */
export const MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS = 30_000;
export const MCP_DIAGRAM_CHECK_TIMEOUT_MS = 10_000;

/** Mermaid checks diagrams one at a time; hundreds in one call would stall every other call. */
export const MCP_DIAGRAMS_PER_WRITE = 20;

/** One checker serves all writes; a full queue makes the newcomer retry instead of lengthening everyone's wait. */
export const MCP_DIAGRAM_CHECKS_WAITING_MAX = 16;

export const MCP_ICON_SEARCH_DEFAULT = 20;
export const MCP_ICON_SEARCH_MAX = 100;

export const MCP_FORMULA_MAX_LENGTH = maximumFormulaLatexLength;

export const MCP_LIST_ITEMS_PER_BLOCK = 200;

export const MCP_TABLE_ROWS_MAX = maximumTableRows;
export const MCP_TABLE_COLUMNS_MAX = maximumTableColumns;

export const MCP_TOGGLE_SUMMARY_MAX_LENGTH = maximumToggleSummaryLength;

export const MCP_ID_MAX_LENGTH = 128;

export const MCP_COMMENT_DATE_MAX_LENGTH = 64;

export const MCP_TEXT_MAX_LENGTH = 10_000;

export const MCP_ACTION_TARGET_MAX_LENGTH = 300;
