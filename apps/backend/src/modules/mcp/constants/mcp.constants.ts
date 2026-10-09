import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@company-brain/shared';

export const MCP_PRINCIPAL_RESOLVER = Symbol('MCP_PRINCIPAL_RESOLVER');
export const MCP_SERVER_DEPENDENCIES = Symbol('MCP_SERVER_DEPENDENCIES');

export const MCP_ROUTE = 'mcp';

/** The call limit counts requests, so a batch of a thousand would count as one. */
export const MCP_BATCH_REFUSED_MESSAGE = 'Send one call per request; several calls in one request are not accepted.';

/** Prisma's unique-constraint error code; here, another request with the same id. */
export const MCP_UNIQUE_VIOLATION_CODE = 'P2002';

/** Older pending requests may or may not have run, so their ids stay taken: retrying could duplicate them. */
export const MCP_ABANDONED_REQUEST_MS = 10 * 60 * 1000;

/** Placeholder origin for the web request handed to the MCP handler, which only reads its path. */
export const MCP_WEB_REQUEST_ORIGIN = 'http://mcp.local';

/** Client id reported to the SDK for personal-token callers. */
export const MCP_ACCESS_TOKEN_CLIENT_ID = 'company-brain-access-token';

export const MCP_SERVER_INFO = { name: 'company-brain', version: '0.1.0' } as const;

/** Renaming one breaks the configuration of anyone already using it. */
export const MCP_TOOL_NAMES = {
  commentOnBlock: 'comment_on_block',
  createCollection: 'create_collection',
  createPage: 'create_page',
  createRow: 'create_row',
  createView: 'create_view',
  deleteBlocks: 'delete_blocks',
  deleteComment: 'delete_comment',
  duplicatePage: 'duplicate_page',
  deleteView: 'delete_view',
  fetch: 'fetch',
  getCollection: 'get_collection',
  insertBlocks: 'insert_blocks',
  listPages: 'list_pages',
  listSpaces: 'list_spaces',
  listTrash: 'list_trash',
  moveBlocks: 'move_blocks',
  movePage: 'move_page',
  queryCollection: 'query_collection',
  restorePage: 'restore_page',
  search: 'search',
  searchDiagramIcons: 'search_diagram_icons',
  trashPage: 'trash_page',
  updateBlock: 'update_block',
  updateCollectionColumns: 'update_collection_columns',
  updatePage: 'update_page',
  updateRow: 'update_row',
  updateTable: 'update_table',
  updateView: 'update_view',
} as const;

export const MCP_HARD_BREAK_NODE = { type: 'hard_break' } as const;

/** Matches the empty paragraph the portal starts a page with. */
export const MCP_EMPTY_PARAGRAPH_NODE = { content: [], type: 'paragraph' } as const;

export const MCP_EMPTY_PAGE_CONTENT: PageContent = {
  content: [MCP_EMPTY_PARAGRAPH_NODE],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};

/** Lives in the tool description: the nested block description in the schema often goes unread. */
export const MCP_DIAGRAM_LOGOS_NOTE =
  'A diagram block can draw real product logos and icons (Postgres, AWS, a server): find them with search_diagram_icons.';

/** Web protocols only: nothing that executes code or opens another app. */
export const MCP_BOOKMARK_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** Stands in for non-text inline objects (mentions, formulas) when searching a line for words. */
export const MCP_INLINE_OBJECT_PLACEHOLDER = '￼';

export const MCP_BLOCK_COLOR_NAMES = ['backgroundColor', 'textColor'] as const;

/** Attributes carried over to a replacement block: comments and colors. */
export const MCP_BLOCK_KEPT_ATTRIBUTES = ['comments', ...MCP_BLOCK_COLOR_NAMES] as const;

/** Message the diagram worker posts once Mermaid is loaded. */
export const MCP_DIAGRAM_WORKER_READY = 'ready';

/** A `.ts` file next to the adapter that spawns it: the backend runs from source. */
export const MCP_DIAGRAM_WORKER_FILE = './mcp.diagram.worker.ts';

/** Content rendered from written source, so it is checked before being saved. */
export const MCP_DRAWING_KINDS = {
  diagram: 'diagram',
  formula: 'formula',
  inlineFormula: 'inline formula',
} as const;

/** Architecture: `service db(logos:postgresql)`. Flowchart: `A@{ icon: "mdi:server" }`. */
export const MCP_DIAGRAM_ICON_PATTERNS: readonly RegExp[] = [
  /\(([a-z0-9-]+:[a-z0-9-]+)\)/g,
  /icon:[ \t]*["']([a-z0-9-]+:[a-z0-9-]+)["']/g,
  /^[ \t]*(?:group|service)[ \t]+[\w-]+\(([\w-]+)\)/gm,
];

/** Indentation excludes newlines: thousands of blank lines would otherwise take quadratic time. */
export const MCP_ARCHITECTURE_DIAGRAM_START = /^[ \t]*architecture-beta\b/m;

export const MCP_ARCHITECTURE_MEMBER_LINE = /^([ \t]*)(group|service|junction)[ \t]+([\w-]+)/;

export const MCP_ARCHITECTURE_WORD_SEPARATOR = /[ \t]+/;

/** Keyword placing a line in a group: `… in <group>`. */
export const MCP_ARCHITECTURE_IN_WORD = 'in';

export const MCP_ARCHITECTURE_NAME = /^[\w-]+$/;

export const MCP_ARCHITECTURE_GROUP = 'group';

/** Icons Mermaid draws without a pack; any other bare name renders as a question mark. */
export const MCP_DIAGRAM_BUILT_IN_ICONS: readonly string[] = ['cloud', 'database', 'disk', 'internet', 'server'];

export const MCP_ICON_NAME_SEPARATORS = /[\s\-_]+/;

export const MCP_PARAGRAPH_SEPARATOR = /\n\s*\n/;

export const MCP_LINE_SEPARATOR = /\r?\n/;

export const MCP_STDIO_LOG_LEVEL = 'info';

export const MCP_CALL_OUTCOMES = { done: 'DONE', failed: 'FAILED', refused: 'REFUSED' } as const;

/** Logged instead of the refusal message, which may quote what the agent wrote. */
export const MCP_REFUSAL_REASONS = {
  diagram: 'diagram',
  diagramGroup: 'diagram group',
  diagramIcon: 'diagram icon',
  formula: 'formula',
} as const;

export const MCP_OFFSET_CURSOR_PATTERN = /^\d{1,6}$/;

export const MCP_NOT_A_COLLECTION_MESSAGE =
  'This page is not a collection: it has no columns. To find the collections, list the spaces with list_spaces and the pages at their top with list_pages: collections are marked as such.';

export const MCP_NOT_A_ROW_MESSAGE =
  'This page is not a row of a collection. A row is a page right under a collection; list_pages or query_collection give their ids.';

export const MCP_PAGE_LOCKED_MESSAGE =
  'This page is locked against edits. Ask a person to unlock it in Company Brain before changing it.';

export const MCP_CONCURRENT_CHANGE_MESSAGE =
  'Somebody changed the same thing a moment ago. Read the collection again with get_collection and retry.';

/** Same wording for a missing page and an inaccessible one, so existence is not revealed. */
export const MCP_UNREACHABLE_REFERENCE_MESSAGE =
  'A mention or a block points at a page that does not exist or is not accessible. Point only at pages you can open with fetch.';

export const MCP_CREATE_PAGE_PLACE_MESSAGE =
  'Say where the page goes: a parent page (a link or id), or a space id for the top of that space. Only one of the two.';

export const MCP_NOTHING_TO_CHANGE_MESSAGE = 'Nothing to change: say what should change.';

/** Refusals answered as "not found": saying more would confirm the resource exists. */
export const MCP_INACCESSIBLE_REFUSAL_CODES: readonly string[] = ['PAGE_ACCESS_DENIED', 'PAGE_SCHEMA_NOT_FOUND'];

export const MCP_LOCKED_REFUSAL_CODE = 'PAGE_LOCKED';

export const MCP_VERIFIED_HIT_MARK = ', verified page';

export const MCP_PAGE_MANAGE_REFUSED_MESSAGE =
  'This token may write this page but not lock it, vouch for it or give it an owner: that needs the permission to manage pages, which only the owner of the token can give it. Nothing was changed.';

export const MCP_PAGE_ICON_INVALID_MESSAGE = 'The icon must be one emoji.';

export const MCP_REFUSAL_EXPLANATIONS: ReadonlyMap<string, string> = new Map([
  ['PAGE_CYCLE', 'A page cannot go under itself or under a page that hangs from it.'],
  ['PAGE_ICON_INVALID', MCP_PAGE_ICON_INVALID_MESSAGE],
  [
    'PAGE_INVALID_LIFECYCLE',
    'The page is not where that can happen: only a page out of the trash can be sent to it, and only a page in the trash can be restored.',
  ],
  ['PAGE_OWNER_INVALID', 'The owner must be a member of the workspace.'],
  [
    'PAGE_PARENT_INVALID',
    'The page it would go under does not exist or is in another space: name a page of the destination space, or only the space.',
  ],
]);

/** Only these refusals pass their detail to the agent, since it helps correct what it wrote. */
export const MCP_DETAILED_REFUSAL_CODES: readonly string[] = [
  'PAGE_BLOCK_EDIT_INVALID',
  'PAGE_CONTENT_INVALID',
  'PAGE_COVER_INVALID',
  'PAGE_PROPERTY_CONFORMANCE',
  'PAGE_PROPERTY_INVALID',
  'PAGE_SCHEMA_DEFINITION_INVALID',
  'SCHEMA_PROPERTY_DEFINITION_INVALID',
  'SCHEMA_PROPERTY_VALUE_INVALID',
  'SCHEMA_VIEW_INVALID',
];

export const MCP_REQUEST_ALREADY_DONE_MESSAGE = 'This request id was already carried out, so nothing was done again.';

export const MCP_REQUEST_IN_PROGRESS_MESSAGE =
  'A call with this request id is still under way. Wait a moment and read the page to see whether it was done, instead of sending it again.';

export const MCP_REQUEST_ID_TAKEN_MESSAGE =
  'This request id was already used for another call, so nothing was done. Use a new request id for each different call.';

export const MCP_REQUEST_UNKNOWN_MESSAGE =
  'A call with this request id started long ago and it is not known whether it was done. Read the page to check; if what you asked for is not there, send it again with a new request id.';

export const MCP_PAGE_IN_TRASH_MESSAGE =
  'This page is in the trash, so it cannot be changed. Bring it back with restore_page first, or ask a person.';

export const MCP_FETCHED_IN_TRASH_NOTE =
  'This page is in the trash: what it says no longer counts for the team. restore_page brings it back.';

export const MCP_PAGE_NOT_IN_TRASH_MESSAGE = 'This page is not in the trash, so there is nothing to bring back.';

export const MCP_CONCURRENT_REFUSAL_CODES: readonly string[] = [
  'PAGE_SCHEMA_CHANGED',
  'PAGE_VIEW_NOT_FOUND',
  'SCHEMA_PROPERTY_DEFINITION_INVALID',
];

export const MCP_REFUSED_CHANGE_PREFIX = 'Company Brain refused the change:';

/** Naming a page the agent cannot see would already leak too much. */
export const MCP_REDACTED_REFERENCE_LABEL = '[unavailable page]';

export const MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE =
  'This token cannot do that to the whole tree under this page, so nothing was done. Ask the owner of the token or of the page.';

export const MCP_CONFIGURED_UNREADABLE_NOTE =
  'Saved. This token may change this collection but not read it, so its columns and views are not shown:';

export const MCP_WRITTEN_UNREADABLE_NOTE =
  'Written. This token may write this page but not read it, so what the page says is not shown:';

export const MCP_INLINE_REFERENCE_TYPES: readonly string[] = ['mention'];

/** Types that show the target page's name, stored when written. */
export const MCP_LABELED_REFERENCE_TYPES: readonly string[] = ['mention', 'subpage'];

/** Blocks that show or act on another page: its title, one of its blocks, its rows, or a button adding rows to it. */
export const MCP_BLOCK_REFERENCE_TYPES: readonly string[] = ['button', 'collection', 'subpage', 'synced'];

export const MCP_BLOCK_NOT_FOUND_NOTE =
  'The block you asked for is no longer on this page. This is the page it was on, as it is now.';

export const MCP_REDACTED_REFERENCE_WORD = { text: MCP_REDACTED_REFERENCE_LABEL, type: 'text' } as const;

export const MCP_VALUELESS_FILTER_OPERATORS: readonly string[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];

/** Combining accent marks, stripped when matching agent input against names. */
export const MCP_ACCENT_MARKS = /\p{M}/gu;

/** Page segment of a portal link: `/spaces/<space>/pages/<page>`. */
export const MCP_PAGE_IN_PATH_PATTERN = /\/pages\/([^/?#\s]+)/;

export const MCP_LIST_PAGES_PLACE_MESSAGE =
  'Say where to list from: pass a spaceId for the pages at the top of a space, or a parentPageId for the pages under a page.';

export const MCP_UNREADABLE_ADDRESS_MESSAGE =
  'This is not a Company Brain link or id. Pass a page or block link copied from Company Brain, or a page or block id.';

/** Same answer for missing and forbidden resources. */
export const MCP_INACCESSIBLE_MESSAGE = 'Resource not accessible.';

export const MCP_UNAUTHENTICATED_MESSAGE =
  'The access token is missing, revoked or expired. Ask the person to create a new one in their Company Brain account settings.';

export const MCP_UNREADABLE_PAGE_MESSAGE =
  'This page is stored in a format this version of Company Brain cannot read. Ask a person to open it in the portal.';

/** Deliberately vague: the detail stays in the server log. */
export const MCP_UNEXPECTED_MESSAGE = 'Something went wrong on the Company Brain side. Try again in a moment.';

/**
 * Read on connect, except the portal-location line, which depends on where the server runs.
 * Kept short on purpose: every word is paid for in every conversation. Per-tool how-to lives in tool descriptions.
 * It names tasks explicitly: a coding agent otherwise thinks of its own task list.
 */
export const MCP_SERVER_INSTRUCTION_LINES: readonly string[] = [
  "Company Brain is the team's knowledge base: its documentation, notes, processes, projects, and its tasks and boards.",
  'When the person asks about the company, the team, its work or its tasks, look in Company Brain before saying there is nothing.',
  'When the person names a page, manual, gallery or document without a link, search for it by name here before asking them for more.',
  'Content lives in spaces; a space holds a tree of pages, and a page is made of blocks.',
  'A collection is a page whose child pages are rows with properties (a table or kanban board of tasks, for instance).',
  'To find information, start with search: it returns the exact blocks that match, with their page and section.',
  'To open something, use fetch with a Company Brain link, a page id or a block id.',
  'Pages come back as Markdown; the comment before each block carries its id. To browse, use list_spaces and list_pages.',
  'If your token can write pages, read the page with fetch first to get its block ids, then write with insert_blocks, update_block, move_blocks or delete_blocks; create_page makes a new page. Write each block by what it means: a table as a table, code or a diagram drawn with spaces as a code_block.',
  'Diagrams are Mermaid, any kind, and can show product logos and icons (never emojis in their place): find their names with search_diagram_icons before drawing.',
  'Besides text, a page holds columns side by side, link cards, videos from YouTube, Vimeo, Loom or Figma, and blocks synced from another page: write them as blocks too.',
  'A remark or a question about a block is a comment (comment_on_block), not text written into the page. Words can be underlined, coloured or highlighted, and a whole block painted with update_block; a table is changed cell by cell with update_table. update_page, move_page, duplicate_page, trash_page and restore_page change a page as a whole; list_trash shows what is in the trash, which search does not find. fetch says whether a page is verified, locked and who owns it.',
  'To work with a collection, read its columns and views with get_collection and find rows with query_collection. If your token can write, create_row adds a row and update_row changes one: moving a task on a board is changing its status.',
  'When the person asks to add, note or change a task of the team or of "our board", do it on a Company Brain collection, never in your own session\'s task list.',
  'A board may be named in another language than the request (a task board may be called Tasks). If searching by name finds no collection, list the spaces and the pages at their top: collections are marked as such.',
  'You act as the person who created your access token, limited to what the token allows: anything out of its reach answers as not accessible, the same as something that does not exist.',
];
