/**
 * Marks whichever element — a page row, or the space-root zone — the
 * dragged page would land on if released now.
 *
 * There is no "before" or "after": `move()` always appends, so the only
 * destinations offered are ones the backend can actually keep — inside a
 * page, or at the space's root.
 */
export const PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE = 'data-sidebar-page-drop-target';

/** The keyboard alternative to dragging: nest under the sibling above, or climb out to the parent's level. */
export const PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE = {
  Indent: 'indent',
  Outdent: 'outdent',
} as const;

/**
 * What a dragged page carries with it, as its own kind of thing.
 *
 * A space row sits outside the tree that started the drag and cannot see its
 * state, so the page announces itself on the drag instead: while it is only
 * being dragged over, the browser lets one read the kind but not the contents,
 * which is enough to know whether to light the row up.
 */
export const PORTAL_SIDEBAR_PAGE_DRAG_TYPE = 'application/x-company-brain-page';

/** What a dragged space carries, told apart from a dragged page so one row can receive both. */
export const PORTAL_SIDEBAR_SPACE_DRAG_TYPE = 'application/x-company-brain-space';
