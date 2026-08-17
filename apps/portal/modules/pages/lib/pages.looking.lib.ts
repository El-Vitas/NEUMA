/** Read as somebody looks for it: capitals and accents are not part of the asking. */
export const foldPageLookingCharacter = (character: string): string =>
  character
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** A whole stretch of writing, read the same way, one character at a time. */
export const foldPageLookingText = (text: string): string => {
  let folded = '';
  for (let index = 0; index < text.length; index += 1) folded += foldPageLookingCharacter(text[index] ?? '');
  return folded;
};
