export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 20;

// Normalized phone (separators stripped): optional +, then 8-15 digits.
export const PHONE_PATTERN = /^\+?\d{8,15}$/;

// Phone as typed in a form, separators included.
export const PHONE_INPUT_PATTERN = /^[+\d\s().-]{7,20}$/;
