import { describe, expect, it } from 'bun:test';
import { PAGE_PROPERTY_KEY_MAX_LENGTH } from './page-property.key.constants.js';
import { buildPagePropertyKey } from './page-property.key.lib.js';

describe('buildPagePropertyKey', () => {
  it('turns what somebody typed into a key the schema accepts', () => {
    expect(buildPagePropertyKey('Fecha de entrega', [])).toBe('fecha_de_entrega');
  });

  it('drops accents and punctuation, because a key is not what the reader sees', () => {
    expect(buildPagePropertyKey('¿Año?', [])).toBe('ano');
  });

  it('never starts with a digit, since the schema refuses it', () => {
    expect(buildPagePropertyKey('2024', [])).toBe('p2024');
  });

  it('gives a name already taken a number of its own instead of overwriting it', () => {
    expect(buildPagePropertyKey('Status', [{ key: 'title' }, { key: 'status' }])).toBe('status_2');
  });

  it('falls back to a readable name when nothing usable was typed', () => {
    expect(buildPagePropertyKey('«»', [])).toBe('property');
  });

  it('keeps a long name within what the server stores, prefix and number included', () => {
    const long = 'a'.repeat(100);
    const taken = [{ key: buildPagePropertyKey(long, []) }];

    expect(buildPagePropertyKey(long, [])).toHaveLength(PAGE_PROPERTY_KEY_MAX_LENGTH);
    expect(buildPagePropertyKey(`1${long}`, [])).toHaveLength(PAGE_PROPERTY_KEY_MAX_LENGTH);
    expect(buildPagePropertyKey(long, taken)).toHaveLength(PAGE_PROPERTY_KEY_MAX_LENGTH);
    expect(buildPagePropertyKey(long, taken).endsWith('_2')).toBe(true);
  });

  it('counts up past every number already taken', () => {
    expect(buildPagePropertyKey('2024', [{ key: 'p2024' }, { key: 'p2024_2' }])).toBe('p2024_3');
  });
});
