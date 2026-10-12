import type { PageBlockComment } from '@neuma/shared';
import type { PageEditorBlockColors } from '../../blocks/types/pages.editor.block-color.types';
import type { PageEditorBlockRequest } from '../../blocks/types/pages.editor.block-request.types';
import type { PageEditorBlockConversion } from '../../blocks/types/pages.editor.convert.types';
import type { PageEditorCalloutIconChoice } from '../../structure/types/pages.editor.callout-icon.types';
import type { PageSyncedReference } from '../../structure/types/pages.editor.synced.types';
import type { PageEditorLinkTarget } from './pages.editor.link-shape.types';
import type { PageEditorPageShapeTarget } from './pages.editor.page-shape.types';

export interface PageEditorSpot {
  readonly left: number;
  readonly top: number;
}

export interface PageEditorSurfaceRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export interface PageEditorCollectionHost {
  readonly element: HTMLElement;
  /** Unique per spot: the same collection may be shown twice on a page. */
  readonly name: string;
  readonly pageId: string;
  readonly viewName: null | string;
}

export interface PageEditorSurfaceState {
  readonly pageShape: PageEditorPageShapeTarget | null;
  readonly syncedTarget: PageSyncedReference | null;
  readonly buttonAt: number | null;
  readonly textColors: PageEditorBlockColors;
  readonly marksInUse: readonly string[];
  readonly blockId: string | null;
  readonly calloutIcon: PageEditorCalloutIconChoice | null;
  readonly colors: PageEditorBlockColors;
  readonly comments: readonly PageBlockComment[];
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly foldState: { readonly isFolded: boolean } | null;
  readonly blockAlign: { readonly chosen: string | null } | null;
  readonly fileDisplay: { readonly chosen: string } | null;
  readonly linkTarget: PageEditorLinkTarget | null;
  readonly isInTable: boolean;
  readonly menuPosition: PageEditorSpot | null;
  readonly request: PageEditorBlockRequest | null;
  readonly selectedBlockCount: number;
  readonly toolbarPosition: PageEditorSpot | null;
}

export interface PageEditorBlockWatch {
  readonly blockId: string;
  readonly onFound: (block: Element) => void;
  readonly onMissing: () => void;
  readonly root: ParentNode;
  readonly waitMs: number;
}
