import { describe, expect, test } from 'bun:test';
import { buildSearchInsideWordPattern } from '@/modules/search/utils/search.pattern.utils';

describe('buildSearchInsideWordPattern', () => {
  test('looks for what was searched anywhere in the text', () => {
    expect(buildSearchInsideWordPattern('safe')).toBe('%safe%');
  });

  /** Quien busca «100%» o «mi_tabla» busca esos signos, no cualquier cosa en su lugar. */
  test('takes the wildcards of a pattern as the plain signs they are', () => {
    expect(buildSearchInsideWordPattern('100%')).toBe('%100\\%%');
    expect(buildSearchInsideWordPattern('mi_tabla')).toBe('%mi\\_tabla%');
    expect(buildSearchInsideWordPattern('a\\b')).toBe('%a\\\\b%');
  });

  /** Dos letras están dentro de casi todo: buscarlas así trae cualquier página. */
  test('does not look inside words for fewer than three letters', () => {
    expect(buildSearchInsideWordPattern('de')).toBeNull();
    expect(buildSearchInsideWordPattern('  de  ')).toBeNull();
  });
});
