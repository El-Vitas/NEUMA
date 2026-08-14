import { describe, expect, it } from 'bun:test';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

describe('portal message catalogs', () => {
  const getMessageShape = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(getMessageShape);
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
          .map(([key, child]) => [key, getMessageShape(child)]),
      );
    }
    return typeof value;
  };

  it('contains the migrated English namespaces', () => {
    expect(Object.keys(en)).toEqual([
      'common',
      'navigation',
      'auth',
      'portal',
      'account',
      'users',
      'spaces',
      'pages',
      'errors',
      'validation',
      'metadata',
      'theme',
      'language',
      'docs',
    ]);
  });

  it('provides Spanish values for representative migrated keys', () => {
    expect(JSON.stringify(es)).toContain('Iniciar sesión');
    expect(JSON.stringify(es)).toContain('Espacios');
    expect(JSON.stringify(es)).toContain('{count, plural');
    expect(JSON.stringify(en)).toContain('Sign in');
  });

  it('keeps English and Spanish message key shapes identical', () => {
    expect(getMessageShape(es)).toEqual(getMessageShape(en));
  });
});
