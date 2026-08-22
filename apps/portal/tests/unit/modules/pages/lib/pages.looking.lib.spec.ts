import { describe, expect, it } from 'bun:test';
import { foldPageLookingCharacter, foldPageLookingText } from '@/modules/pages/links/lib/pages.looking.lib';

describe('foldPageLookingCharacter', () => {
  it('reads past capitals and accents, one character at a time', () => {
    expect(foldPageLookingCharacter('É')).toBe('e');
    expect(foldPageLookingCharacter('Ñ')).toBe('n');
  });

  it('leaves a character untouched when it carries nothing to fold', () => {
    expect(foldPageLookingCharacter('x')).toBe('x');
  });
});

describe('foldPageLookingText', () => {
  it('folds capitals and accents so they no longer matter', () => {
    expect(foldPageLookingText('CAFÉ y NIÑO')).toBe('cafe y nino');
  });

  it('does not trim: what was written is what is folded, sign for sign', () => {
    expect(foldPageLookingText('  Café  ')).toBe('  cafe  ');
  });

  it('can grow past the length of what was written', () => {
    // '가' folds to two code units (its NFD decomposition is not stripped, since neither jamo is a diacritic),
    // one raw character producing two folded ones — exactly the case a caller mapping folded text back to
    // positions in the original string has to account for.
    expect(foldPageLookingText('가').length).toBeGreaterThan('가'.length);
  });
});
