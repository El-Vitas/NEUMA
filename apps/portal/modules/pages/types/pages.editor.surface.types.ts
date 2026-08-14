import type { PageBlockComment } from '@company-brain/shared';
import type { PageEditorBlockColors } from './pages.editor.block-color.types';
import type { PageEditorBlockRequest } from './pages.editor.block-request.types';
import type { PageEditorCalloutIconChoice } from './pages.editor.callout-icon.types';
import type { PageEditorBlockConversion } from './pages.editor.convert.types';
import type { PageEditorLinkTarget } from './pages.editor.link-shape.types';

/** Where on the screen a spot of the page is, measured from the editor's own box. */
export interface PageEditorSpot {
  readonly left: number;
  readonly top: number;
}

/** The editor's own box, as the placement of menus is measured against it. */
export interface PageEditorSurfaceRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/** Where a collection block stands, so its own page can be rendered into it. */
export interface PageEditorCollectionHost {
  readonly element: HTMLElement;
  readonly pageId: string;
}

/** What the page around the editor shows about the blocks in play. */
export interface PageEditorSurfaceState {
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

/** A block being waited for on a page that may still be drawing itself. */
export interface PageEditorBlockWatch {
  readonly blockId: string;
  readonly onFound: (block: Element) => void;
  readonly onMissing: () => void;
  readonly root: ParentNode;
  readonly waitMs: number;
}
