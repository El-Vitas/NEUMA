import type { PageEditorCodeLabels } from './pages.editor.code.types';
import type { PageEditorContentsLabels } from './pages.editor.contents.types';
import type { PageEditorDocumentLabels } from './pages.editor.document.types';
import type { PageEditorEmbedLabels } from './pages.editor.embed.types';
import type { PageEditorImageLabels } from './pages.editor.image.types';
import type { PageEditorMediaLabels } from './pages.editor.media.types';
import type { PageEditorSyncedLabels } from './pages.editor.synced.types';

/** What the two controls of a toggle are called, since neither is a stretch of text to read. */
export interface PageEditorToggleLabels {
  readonly open: string;
  readonly title: string;
}

/** What a page hanging from this one is called, and what an unnamed one is called. */
export interface PageEditorSubpageLabels {
  readonly subpage: string;
  readonly untitled: string;
}

/** The user-visible names the editor's node views need, kept out of the libs that render them. */
export interface PageEditorNodeViewLabels {
  readonly code: PageEditorCodeLabels;
  readonly collection: string;
  readonly contents: PageEditorContentsLabels;
  readonly subpage: PageEditorSubpageLabels;
  readonly synced: PageEditorSyncedLabels;
  readonly embed: PageEditorEmbedLabels;
  readonly file: PageEditorDocumentLabels;
  readonly image: PageEditorImageLabels;
  readonly media: PageEditorMediaLabels;
  readonly task: string;
  readonly toggle: PageEditorToggleLabels;
  readonly unsupported: string;
}
