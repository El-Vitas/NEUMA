import { randomInt } from 'node:crypto';
import { PAGE_OPTION_ID_LENGTH } from '@neuma/shared';
import { OPTION_ID_ALPHABET } from '../constants/option-id.constants';

/** The id the server gives an option: short, because every row that picks the option carries it. */
export const generateOptionId = (): string =>
  Array.from({ length: PAGE_OPTION_ID_LENGTH }, () =>
    OPTION_ID_ALPHABET.charAt(randomInt(OPTION_ID_ALPHABET.length)),
  ).join('');
