/** The three shapes a pasted link can take on a page. */
export const PAGE_EDITOR_LINK_SHAPES = ['link', 'card', 'embed'] as const;

/** Where the page asks what a link says about itself. */
export const PAGE_LINK_PREVIEW_ROUTE = '/api/link-preview';

/** Writing pasted around an address is writing; only an address alone is a link. */
export const PAGE_EDITOR_LINK_WHITESPACE = /\s/;
