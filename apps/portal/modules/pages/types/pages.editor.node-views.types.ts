import type { PageEditorButtonLabels } from './pages.editor.button.types';
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

/** What a mention says once the page it names has been thrown away. */
export interface PageEditorMentionTrashedLabels {
  readonly label: string;
  /** The explanation under the pointer, formatted with the mentioned page's name. */
  readonly tooltip: (name: string) => string;
}

/**
 * What a date is called, the field where another day is picked, and which
 * language's Intl.DateTimeFormat draws its calendar day.
 */
export interface PageEditorDateLabels {
  readonly field: string;
  readonly label: string;
  readonly locale: string;
}

/**
 * What an inline formula is called, what an unwritten one is called, and what
 * its editing field says.
 */
export interface PageEditorFormulaLabels {
  readonly done: string;
  readonly empty: string;
  readonly field: string;
  readonly help: string;
  readonly inline: string;
  readonly unreadable: string;
}

/** The user-visible names the editor's node views need, kept out of the libs that render them. */
export interface PageEditorNodeViewLabels {
  readonly button: PageEditorButtonLabels;
  readonly code: PageEditorCodeLabels;
  readonly collection: string;
  readonly contents: PageEditorContentsLabels;
  readonly date: PageEditorDateLabels;
  readonly subpage: PageEditorSubpageLabels;
  readonly synced: PageEditorSyncedLabels;
  readonly embed: PageEditorEmbedLabels;
  readonly file: PageEditorDocumentLabels;
  readonly formula: PageEditorFormulaLabels;
  readonly image: PageEditorImageLabels;
  readonly media: PageEditorMediaLabels;
  readonly mentionTrashed: PageEditorMentionTrashedLabels;
  readonly person: string;
  readonly task: string;
  readonly toggle: PageEditorToggleLabels;
  readonly unsupported: string;
}
