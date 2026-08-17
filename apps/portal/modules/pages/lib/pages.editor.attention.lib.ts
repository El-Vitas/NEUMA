import { PAGE_EDITOR_OWN_SURFACES_SELECTOR } from '../constants/pages.editor.attention.constants';

/**
 * Whether the writing is still what somebody is working on, once the focus has
 * moved off it.
 *
 * The bar over a chosen stretch of writing belongs to that moment, and the
 * moment ends when the reader goes elsewhere — to the title, to the menu at the
 * side, to another field. It does not end because they reached into the bar's
 * own menu, which is still the bar; nor because the whole window was left,
 * since that is not going somewhere else on the page but stepping away from it.
 */
export const isTheWritingStillInHand = (tookTheFocus: Element | null, surface: HTMLElement | null): boolean => {
  if (tookTheFocus === null) return true;
  if (surface !== null && surface.contains(tookTheFocus)) return true;
  return tookTheFocus.closest(PAGE_EDITOR_OWN_SURFACES_SELECTOR) !== null;
};
