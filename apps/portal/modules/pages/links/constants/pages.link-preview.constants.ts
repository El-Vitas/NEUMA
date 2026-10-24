/** A longer tag is skipped: pages embed whole documents in scripts, and such a tag would quote them. */
export const PAGE_LINK_PREVIEW_TAG_LIMIT = 2000;

export const PAGE_LINK_PREVIEW_TEXT_LIMIT = 300;

export const PAGE_LINK_PREVIEW_TIMEOUT_MS = 5000;

/** Generous because some sites (YouTube) put their title past the 600,000th character. */
export const PAGE_LINK_PREVIEW_READ_LIMIT = 2_000_000;

export const PAGE_LINK_PREVIEW_CONTENT = /content=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_HREF = /href=["']([^"']*)["']/i;

export const PAGE_LINK_PREVIEW_ICON_REL = /rel=["'][^"']*icon/i;

export const LINK_PREVIEW_ALLOWED_PROTOCOL = 'https:';

export const LINK_PREVIEW_ALLOWED_PORT = '443';

export const LINK_PREVIEW_IPV6_GROUPS = 8;
export const LINK_PREVIEW_IPV6_GROUP_RADIX = 16;
export const LINK_PREVIEW_BYTE_RANGE = 256;
export const LINK_PREVIEW_IPV6_GROUP_MAXIMUM = 0xff_ff;
export const LINK_PREVIEW_IPV6_MAPPED_MARKER = 0xff_ff;
export const LINK_PREVIEW_IPV6_NAT64_MARKER = 0xff_9b;
export const LINK_PREVIEW_IPV6_6TO4_PREFIX = 0x20_02;
export const LINK_PREVIEW_IPV6_TEREDO_PREFIX = 0x20_01;
export const LINK_PREVIEW_IPV6_GLOBAL_MASK = 0xe0_00;
export const LINK_PREVIEW_IPV6_GLOBAL_PREFIX = 0x20_00;

export const LINK_PREVIEW_RATE_LIMIT_WINDOW_MS = 60_000;

export const LINK_PREVIEW_RATE_LIMIT_MAXIMUM = 30;

export const LINK_PREVIEW_RATE_LIMIT_TRACKED_KEYS_MAXIMUM = 10_000;

export const LINK_PREVIEW_CLOSED_HOSTS = ['localhost', '::1', '0.0.0.0', 'metadata.google.internal'];

/** Suffixes that only resolve on private networks, so a hostname cannot hide a private address. */
export const LINK_PREVIEW_CLOSED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.intranet', '.home.arpa'];

export const LINK_PREVIEW_IPV4_SHAPE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export const LINK_PREVIEW_MAXIMUM_HOPS = 3;
