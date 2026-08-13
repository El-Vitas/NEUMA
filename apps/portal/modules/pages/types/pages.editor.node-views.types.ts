import type { PageEditorCodeLabels } from './pages.editor.code.types';
import type { PageEditorImageLabels } from './pages.editor.image.types';

/** What the two controls of a toggle are called, since neither is a stretch of text to read. */
export interface PageEditorToggleLabels {
  readonly open: string;
  readonly title: string;
}

/** The user-visible names the editor's node views need, kept out of the libs that render them. */
export interface PageEditorNodeViewLabels {
  readonly code: PageEditorCodeLabels;
  readonly collection: string;
  readonly image: PageEditorImageLabels;
  readonly task: string;
  readonly toggle: PageEditorToggleLabels;
  readonly unsupported: string;
}
