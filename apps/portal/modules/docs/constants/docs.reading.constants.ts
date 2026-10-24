export const DOCS_FRONT_MATTER_FENCE = /^---\n([\s\S]*?)\n---\n?/;

export const DOCS_FRONT_MATTER_LINE = /^([A-Za-z]+):(.*)$/;

export const DOCS_LAST_ORDER = 999;

export const DOCS_HEADING_LINE = /^(#{2,3})\s+(\S.*)$/;

export const DOCS_FENCED_CODE = /^(?:```|~~~)/;

export const DOCS_CONTENT_FOLDER = 'content/docs';

export const DOCS_FILE_SUFFIX = '.md';

/** The name comes from the URL and ends up in a file path, so dots and slashes must not match. */
export const DOCS_SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DOCS_NOT_WRITTEN_CODE = 'ENOENT';

export const DOCS_FALLBACK_LOCALE = 'es';

export const DOCS_DIAGRAM_FENCE = 'mermaid';

export const DOCS_ICONS_FENCE = 'icons';

export const DOCS_FORMULA_FENCE = 'latex';

export const DOCS_FENCE_LANGUAGE_CLASS = /language-([\w-]+)/;

export const DOCS_FENCE_TRAILING_LINE = /\n$/;

export const DOCS_LINK_OUTSIDE = /^https?:\/\//i;

/** Offset in pixels below the top, so the marked heading is the one the reader is under, not one passing by. */
export const DOCS_READING_LINE = 96;
