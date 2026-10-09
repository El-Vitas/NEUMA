import { SEARCH_INSIDE_WORD_MIN_LENGTH, SEARCH_LIKE_SPECIAL_SIGNS } from '../constants/search.constants';

const escapeLikeSign = (sign: string): string => `\\${sign}`;

/** Lo buscado con sus `%`, `_` y `\` escapados, para que valgan como los signos que son y no como comodines. */
const escapeLikeSigns = (text: string): string => text.replaceAll(SEARCH_LIKE_SPECIAL_SIGNS, escapeLikeSign);

/** Lo que alguien escribió, buscado en cualquier parte de un texto con `ILIKE`. */
export const buildSearchAnywherePattern = (text: string): string => `%${escapeLikeSigns(text.trim())}%`;

/**
 * Lo buscado como pedazo de texto para `ILIKE`, así «safe» se encuentra dentro
 * de «ÜSAFE». Sus `%`, `_` y `\` valen como los signos que son. Si es muy
 * corto, nada: se busca solo como palabra entera.
 */
export const buildSearchInsideWordPattern = (query: string): string | null =>
  query.trim().length < SEARCH_INSIDE_WORD_MIN_LENGTH ? null : buildSearchAnywherePattern(query);
