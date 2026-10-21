const FIRST_LOWERCASE_LETTER_CODE = 97;
const LETTERS_IN_THE_ALPHABET = 26;

const LOWERCASE_LETTERS = Array.from({ length: LETTERS_IN_THE_ALPHABET }, (_unused, position) =>
  String.fromCharCode(FIRST_LOWERCASE_LETTER_CODE + position),
).join('');

/** Letters and digits only, so an id reads the same in a URL, in JSON and in a filter. */
export const OPTION_ID_ALPHABET = `${LOWERCASE_LETTERS}${Array.from({ length: 10 }, (_unused, digit) => String(digit)).join('')}`;
