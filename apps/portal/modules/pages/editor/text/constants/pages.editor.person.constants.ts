/** Strokes for a small person glyph, drawn the same way every other mark on a line is drawn. */
export const PAGE_PERSON_MARK_STROKES: readonly string[] = [
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  'M4 20c1.4-4.2 4.8-6.5 8-6.5s6.6 2.3 8 6.5',
];

/** How many members are offered by the `@` finder before it stops asking for more. */
export const PAGE_PERSON_SEARCH_LIMIT = 5;

/** What sits between a name and the address it is reached at, once the pointer rests on it. */
export const PAGE_PERSON_HOVER_SEPARATOR = ' · ';
