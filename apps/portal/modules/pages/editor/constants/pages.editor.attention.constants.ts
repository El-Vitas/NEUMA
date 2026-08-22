const DROPDOWN_MENU_CONTENT_SLOT = 'dropdown-menu-content';
const DROPDOWN_MENU_SUB_CONTENT_SLOT = 'dropdown-menu-sub-content';
const POPOVER_CONTENT_SLOT = 'popover-content';
const DIALOG_ROLE = 'dialog';

/**
 * What the writing opens for itself and answers from.
 *
 * A menu the bar opened is still the bar: the focus moves into it, but nobody
 * has left the writing to go somewhere else on the page.
 */
export const PAGE_EDITOR_OWN_SURFACES_SELECTOR = [
  `[data-slot="${DROPDOWN_MENU_CONTENT_SLOT}"]`,
  `[data-slot="${DROPDOWN_MENU_SUB_CONTENT_SLOT}"]`,
  `[data-slot="${POPOVER_CONTENT_SLOT}"]`,
  `[role="${DIALOG_ROLE}"]`,
].join(',');
