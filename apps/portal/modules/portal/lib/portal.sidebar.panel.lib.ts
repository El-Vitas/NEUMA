import {
  PORTAL_SIDEBAR_TREE_MAX_WIDTH_PX,
  PORTAL_SIDEBAR_TREE_MIN_WIDTH_PX,
} from '../constants/portal.sidebar.panel.constants';

export const clampPortalSidebarTreeWidth = (width: number): number =>
  Math.min(PORTAL_SIDEBAR_TREE_MAX_WIDTH_PX, Math.max(PORTAL_SIDEBAR_TREE_MIN_WIDTH_PX, width));
