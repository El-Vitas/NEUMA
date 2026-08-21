/**
 * Marks whichever element — a page row, or the space-root zone — the
 * dragged page would land on if released now.
 */
export const PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE = 'data-sidebar-page-drop-target';

/**
 * How much of a row means «inside this page» rather than «next to it».
 *
 * The middle of a row nests, and only its edges set a page down beside its
 * sisters. The band is wide on purpose: nesting is the move people make most,
 * and a thin middle would turn every ordinary drop into a coin toss.
 */
export const PORTAL_SIDEBAR_ROW_NESTING_BAND = 0.6;

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
