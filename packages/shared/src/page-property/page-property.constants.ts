export const PAGE_OPTION_ID_LENGTH = 8;

export const PAGE_OPTION_ID_PATTERN = /^[a-z0-9]{8}$/;

export const PAGE_OPTION_NAME_MAX_LENGTH = 100;

export const PAGE_URL_MAX_LENGTH = 2048;

export const PAGE_EMAIL_MAX_LENGTH = 254;

export const PAGE_PHONE_MIN_DIGITS = 6;

export const PAGE_PHONE_MAX_DIGITS = 20;

/** One cell points to at most this many rows. */
export const PAGE_RELATION_MAX_ENTRIES = 100;

export const PAGE_FILES_MAX_ENTRIES = 10;

export const PAGE_NUMBER_MAX_DECIMALS = 8;

export const PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH = 10;

export const PAGE_PERCENT_FACTOR = 100;

/** A computed number has no stored precision: without decimals set it reads with up to this many, zeros trimmed. */
export const PAGE_COMPUTED_MAXIMUM_DECIMALS = 2;

/** The currency a new currency property starts on. */
export const PAGE_DEFAULT_CURRENCY = 'USD';
