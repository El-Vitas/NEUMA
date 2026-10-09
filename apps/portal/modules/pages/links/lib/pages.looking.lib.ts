export const foldPageLookingCharacter = (character: string): string =>
  character
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const foldPageLookingText = (text: string): string => {
  let folded = '';
  for (const unit of text.split('')) folded += foldPageLookingCharacter(unit);
  return folded;
};
