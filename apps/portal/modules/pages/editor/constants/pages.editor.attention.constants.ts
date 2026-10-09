const DROPDOWN_MENU_CONTENT_SLOT = 'dropdown-menu-content';
const DROPDOWN_MENU_SUB_CONTENT_SLOT = 'dropdown-menu-sub-content';
const POPOVER_CONTENT_SLOT = 'popover-content';
const DIALOG_ROLE = 'dialog';

/** Surfaces opened by the editor's own toolbar: focus moving into them does not count as leaving the writing. */
export const PAGE_EDITOR_OWN_SURFACES_SELECTOR = [
  `[data-slot="${DROPDOWN_MENU_CONTENT_SLOT}"]`,
  `[data-slot="${DROPDOWN_MENU_SUB_CONTENT_SLOT}"]`,
  `[data-slot="${POPOVER_CONTENT_SLOT}"]`,
  `[role="${DIALOG_ROLE}"]`,
].join(',');
