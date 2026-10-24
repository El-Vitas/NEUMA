import { describe, expect, test } from 'bun:test';
import { isValidPageEmail, isValidPagePhone, isValidPageUrl } from './page-property.contact.lib.js';

describe('isValidPageUrl', () => {
  test('accepts an http or https address with a host', () => {
    expect(isValidPageUrl('https://neuma.example/docs?a=1#top')).toBe(true);
    expect(isValidPageUrl('http://localhost:3010')).toBe(true);
  });

  test('refuses an address that runs code or has no scheme', () => {
    expect(isValidPageUrl('javascript:alert(1)')).toBe(false);
    expect(isValidPageUrl('neuma.example')).toBe(false);
    expect(isValidPageUrl('ftp://neuma.example')).toBe(false);
    expect(isValidPageUrl('https://')).toBe(false);
  });

  test('refuses an address with spaces or beyond the length limit', () => {
    expect(isValidPageUrl('https://neuma.example/a b')).toBe(false);
    expect(isValidPageUrl(`https://neuma.example/${'a'.repeat(2048)}`)).toBe(false);
  });
});

describe('isValidPageEmail', () => {
  test('accepts a plain address', () => {
    expect(isValidPageEmail('ana@neuma.example')).toBe(true);
    expect(isValidPageEmail('ana.perez+qa@sub.neuma.example')).toBe(true);
  });

  test('refuses what is missing a part', () => {
    expect(isValidPageEmail('ana')).toBe(false);
    expect(isValidPageEmail('ana@neuma')).toBe(false);
    expect(isValidPageEmail('@neuma.example')).toBe(false);
    expect(isValidPageEmail('ana @neuma.example')).toBe(false);
  });

  test('refuses an address over 254 characters', () => {
    expect(isValidPageEmail(`${'a'.repeat(250)}@neuma.example`)).toBe(false);
  });
});

describe('isValidPagePhone', () => {
  test('accepts digits with the usual separators', () => {
    expect(isValidPagePhone('+56 9 1234 5678')).toBe(true);
    expect(isValidPagePhone('(02) 2345-6789')).toBe(true);
  });

  test('refuses letters and numbers too short or too long', () => {
    expect(isValidPagePhone('call me')).toBe(false);
    expect(isValidPagePhone('12345')).toBe(false);
    expect(isValidPagePhone('1'.repeat(21))).toBe(false);
  });
});
