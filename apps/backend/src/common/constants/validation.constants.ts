export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;
export const SEARCH_MAX_LENGTH = 200;
/** Accepts UUID versions 1 to 8 (RFC 9562); page ids are v7. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REFRESH_TOKEN_MIN_LENGTH = 20;

export const REFRESH_TOKEN_MAX_LENGTH = 4096;
