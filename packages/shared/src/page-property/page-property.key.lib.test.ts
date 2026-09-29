import { describe, expect, it } from 'bun:test';
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
});
