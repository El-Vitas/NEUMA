export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 20;

// Phone once normalized (spaces/dashes/parens stripped): optional leading +, then 8-15 digits
// (Chile mobile +569XXXXXXXX, landline +562XXXXXXXX, etc.). Rejects letters and stray symbols.
export const PHONE_PATTERN = /^\+?\d{8,15}$/;

// Phone as typed in a form: digits plus common separators (+, spaces, dashes, parens).
export const PHONE_INPUT_PATTERN = /^[+\d\s().-]{7,20}$/;
