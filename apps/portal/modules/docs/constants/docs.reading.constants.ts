/** What a document says about itself, fenced off at the top of its file. */
export const DOCS_FRONT_MATTER_FENCE = /^---\n([\s\S]*?)\n---\n?/;

/** One thing said about a document: a name, a colon, and what it says. */
export const DOCS_FRONT_MATTER_LINE = /^([A-Za-z]+):(.*)$/;

/** A document that does not say where it goes in the list goes at the end of it. */
export const DOCS_LAST_ORDER = 999;

/** A heading somebody can jump to, which is every heading below the title of the document. */
export const DOCS_HEADING_LINE = /^(#{2,3})\s+(.+)$/;

/** Writing fenced off as code, which is not prose and holds no headings. */
export const DOCS_FENCED_CODE = /^(?:```|~~~)/;

/** Where the documents are written, one folder per language. */
export const DOCS_CONTENT_FOLDER = 'content/docs';

/** What a document is written in. */
export const DOCS_FILE_SUFFIX = '.md';

/** The language a document falls back to when it has not been written in the one being read. */
export const DOCS_FALLBACK_LOCALE = 'es';

/** What tells a fenced block to be drawn as a diagram instead of shown as writing. */
export const DOCS_DIAGRAM_FENCE = 'mermaid';

/** What tells a fenced block to become the gallery of pictures a diagram may name. */
export const DOCS_ICONS_FENCE = 'icons';

/** How a fenced block says what it is written in. */
export const DOCS_FENCE_LANGUAGE_CLASS = /language-([\w-]+)/;

/** The empty line a fenced block always ends with, which is the fence and not the writing. */
export const DOCS_FENCE_TRAILING_LINE = /\n$/;

/** A link that leads out of the workspace, which is any link that names where it is going. */
export const DOCS_LINK_OUTSIDE = /^https?:\/\//i;

/**
 * The band of the screen that counts as being read: from a little below the top
 * down to most of the way, so the heading somebody is under is the one marked,
 * and not whichever one the eye passes on the way down.
 */
export const DOCS_READING_MARGIN = '-96px 0px -70% 0px';
