import { SEARCH_INSIDE_WORD_MIN_LENGTH, SEARCH_LIKE_SPECIAL_SIGNS } from '../constants/search.constants';

const escapeLikeSign = (sign: string): string => `\\${sign}`;

const escapeLikeSigns = (text: string): string => text.replaceAll(SEARCH_LIKE_SPECIAL_SIGNS, escapeLikeSign);

export const buildSearchAnywherePattern = (text: string): string => `%${escapeLikeSigns(text.trim())}%`;

/** Null when the query is too short; it is then matched as a whole word only. */
export const buildSearchInsideWordPattern = (query: string): string | null =>
  query.trim().length < SEARCH_INSIDE_WORD_MIN_LENGTH ? null : buildSearchAnywherePattern(query);
