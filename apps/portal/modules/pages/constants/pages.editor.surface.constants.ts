import type { PageEditorSurfaceState } from '../types/pages.editor.surface.types';

/** What the page shows when no block is in play: nothing on offer, nothing placed. */
export const PAGE_EDITOR_QUIET_SURFACE: PageEditorSurfaceState = {
  blockId: null,
  calloutIcon: null,
  colors: { background: null, text: null },
  comments: [],
  conversions: [],
  foldState: null,
  blockAlign: null,
  fileDisplay: null,
  linkTarget: null,
  pageShape: null,
  syncedTarget: null,
  isInTable: false,
  menuPosition: null,
  request: null,
  selectedBlockCount: 0,
  toolbarPosition: null,
};
