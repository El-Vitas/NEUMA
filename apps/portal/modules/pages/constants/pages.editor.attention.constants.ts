/**
 * What the writing opens for itself and answers from.
 *
 * A menu the bar opened is still the bar: the focus moves into it, but nobody
 * has left the writing to go somewhere else on the page.
 */
export const PAGE_EDITOR_OWN_SURFACES_SELECTOR = [
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="popover-content"]',
  '[role="dialog"]',
].join(',');
