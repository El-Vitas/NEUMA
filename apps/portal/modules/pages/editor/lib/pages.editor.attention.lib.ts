import { PAGE_EDITOR_OWN_SURFACES_SELECTOR } from '../constants/pages.editor.attention.constants';

/**
 * Whether focus left for somewhere unrelated to the writing. Moving into the toolbar's own menus,
 * or losing window focus (null target), does not count.
 */
export const isTheWritingStillInHand = (tookTheFocus: Element | null, surface: HTMLElement | null): boolean => {
  if (tookTheFocus === null) return true;
  if (surface?.contains(tookTheFocus) === true) return true;
  return tookTheFocus.closest(PAGE_EDITOR_OWN_SURFACES_SELECTOR) !== null;
};
