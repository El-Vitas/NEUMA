import {
  PAGE_EMAIL_MAX_LENGTH,
  PAGE_PHONE_MAX_DIGITS,
  PAGE_PHONE_MIN_DIGITS,
  PAGE_URL_MAX_LENGTH,
} from './page-property.constants.js';

const WEB_PROTOCOLS = new Set(['http:', 'https:']);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const PHONE_PATTERN = /^\+?[\d\s\-()]+$/;

const NON_DIGITS = /\D/g;

const hasWhitespace = (text: string): boolean => /\s/.test(text);

export const isValidPageUrl = (text: string): boolean => {
  if (text.length > PAGE_URL_MAX_LENGTH || hasWhitespace(text)) return false;
  if (!URL.canParse(text)) return false;
  const url = new URL(text);
  return WEB_PROTOCOLS.has(url.protocol) && url.hostname !== '';
};

export const isValidPageEmail = (text: string): boolean =>
  text.length <= PAGE_EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(text);

export const isValidPagePhone = (text: string): boolean => {
  if (!PHONE_PATTERN.test(text)) return false;
  const digitCount = text.replaceAll(NON_DIGITS, '').length;
  return digitCount >= PAGE_PHONE_MIN_DIGITS && digitCount <= PAGE_PHONE_MAX_DIGITS;
};
