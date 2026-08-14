/**
 * What is read out of a page that describes itself.
 *
 * Bounded on purpose: a page carries whole documents inside its own scripts,
 * and a tag allowed to run on for ever ends up quoting one of them. A tag that
 * says what a page is called is a short line.
 */
export const PAGE_LINK_PREVIEW_META = /<meta\b[^>]{0,2000}>/gi;

export const PAGE_LINK_PREVIEW_ICON_LINK = /<link\b[^>]*>/gi;

export const PAGE_LINK_PREVIEW_TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;

/** Long enough to say what a page is, short enough that nobody pastes an essay into a card. */
export const PAGE_LINK_PREVIEW_TEXT_LIMIT = 300;

/** How long a site is given to answer before the page stops waiting for it. */
export const PAGE_LINK_PREVIEW_TIMEOUT_MS = 5000;

/**
 * How much of a page is read looking for what it says about itself.
 *
 * Generous on purpose: a page that says its name in the first few lines is the
 * exception, not the rule — YouTube writes it past the six hundred thousandth
 * character, behind everything it loads first. Still a ceiling, because a page
 * that never says its name should not be read for ever.
 */
export const PAGE_LINK_PREVIEW_READ_LIMIT = 2_000_000;

/** What is read out of one tag: what it says, where it points, and what it is for. */
export const PAGE_LINK_PREVIEW_CONTENT = /content=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_HREF = /href=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_ICON_REL = /rel=["'][^"']*icon/i;
