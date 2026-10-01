import { SEARCH_INSIDE_WORD_MIN_LENGTH, SEARCH_LIKE_SPECIAL_SIGNS } from '../constants/search.constants';

/**
 * Lo buscado como pedazo de texto para `ILIKE`, así «safe» se encuentra dentro
 * de «ÜSAFE». Sus `%`, `_` y `\` valen como los signos que son. Si es muy
 * corto, nada: se busca solo como palabra entera.
 */
export const buildSearchInsideWordPattern = (query: string): string | null => {
  const searched = query.trim();
  if (searched.length < SEARCH_INSIDE_WORD_MIN_LENGTH) return null;
  return `%${searched.replaceAll(SEARCH_LIKE_SPECIAL_SIGNS, (sign) => `\\${sign}`)}%`;
};
