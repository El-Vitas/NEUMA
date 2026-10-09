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

/**
 * What a document may be called.
 *
 * The name arrives from the address and ends up in a file path, so anything
 * that could point somewhere other than the manual — a dot, a slash — is not a
 * name here.
 */
export const DOCS_SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** What the system says when the file or the folder asked for does not exist. */
export const DOCS_NOT_WRITTEN_CODE = 'ENOENT';

/** The language a document falls back to when it has not been written in the one being read. */
export const DOCS_FALLBACK_LOCALE = 'es';

/** What tells a fenced block to be drawn as a diagram instead of shown as writing. */
export const DOCS_DIAGRAM_FENCE = 'mermaid';

/** What tells a fenced block to become the gallery of pictures a diagram may name. */
export const DOCS_ICONS_FENCE = 'icons';

/** What tells a fenced block to be set as a formula instead of shown as writing. */
export const DOCS_FORMULA_FENCE = 'latex';

/** How a fenced block says what it is written in. */
export const DOCS_FENCE_LANGUAGE_CLASS = /language-([\w-]+)/;

/** The empty line a fenced block always ends with, which is the fence and not the writing. */
export const DOCS_FENCE_TRAILING_LINE = /\n$/;

/** A link that leads out of the workspace, which is any link that names where it is going. */
export const DOCS_LINK_OUTSIDE = /^https?:\/\//i;

/**
 * Where on the screen reading happens: a little below the top, so the heading
 * marked is the one somebody is under and not whichever one the eye passes on
 * the way down.
 */
export const DOCS_READING_LINE = 96;
