/** Tag matching is bounded because pages embed whole documents in scripts, and an unbounded tag would quote them. */
export const PAGE_LINK_PREVIEW_META = /<meta\b[^>]{0,2000}>/gi;

export const PAGE_LINK_PREVIEW_ICON_LINK = /<link\b[^>]*>/gi;

export const PAGE_LINK_PREVIEW_TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;

export const PAGE_LINK_PREVIEW_TEXT_LIMIT = 300;

export const PAGE_LINK_PREVIEW_TIMEOUT_MS = 5000;

/** Generous because some sites (YouTube) put their title past the 600,000th character. */
export const PAGE_LINK_PREVIEW_READ_LIMIT = 2_000_000;

export const PAGE_LINK_PREVIEW_CONTENT = /content=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_HREF = /href=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_ICON_REL = /rel=["'][^"']*icon/i;

export const LINK_PREVIEW_ALLOWED_PROTOCOL = 'https:';

export const LINK_PREVIEW_CLOSED_HOSTS = ['localhost', '::1', '0.0.0.0', 'metadata.google.internal'];

/** Suffixes that only resolve on private networks, so a hostname cannot hide a private address. */
export const LINK_PREVIEW_CLOSED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.intranet', '.home.arpa'];

export const LINK_PREVIEW_IPV4_SHAPE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export const LINK_PREVIEW_MAXIMUM_HOPS = 3;
