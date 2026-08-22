import { describe, expect, it } from 'bun:test';
import { DOCS_SLUG_SHAPE } from '@/modules/docs/constants/docs.reading.constants';

describe('DOCS_SLUG_SHAPE', () => {
  it('accepts the names documents are actually given', () => {
    expect(DOCS_SLUG_SHAPE.test('primeros-pasos')).toBe(true);
    expect(DOCS_SLUG_SHAPE.test('bloques2')).toBe(true);
  });

  it('refuses a name that could point outside the manual', () => {
    expect(DOCS_SLUG_SHAPE.test('../../../etc/passwd')).toBe(false);
    expect(DOCS_SLUG_SHAPE.test('..')).toBe(false);
    expect(DOCS_SLUG_SHAPE.test('carpeta/documento')).toBe(false);
    expect(DOCS_SLUG_SHAPE.test('nombre.con.punto')).toBe(false);
    expect(DOCS_SLUG_SHAPE.test('')).toBe(false);
  });
});
