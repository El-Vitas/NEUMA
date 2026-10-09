import type { PageEditorEmbedLabels } from '../../media/types/pages.editor.embed.types';
import type { PageEditorImageLabels } from '../../media/types/pages.editor.image.types';
import type { PageEditorMediaLabels } from '../../media/types/pages.editor.media.types';
import type { PageEditorButtonLabels } from '../../structure/types/pages.editor.button.types';
import type { PageEditorCodeLabels } from '../../structure/types/pages.editor.code.types';
import type { PageEditorContentsLabels } from '../../structure/types/pages.editor.contents.types';
import type { PageEditorSyncedLabels } from '../../structure/types/pages.editor.synced.types';
import type { PageEditorDocumentLabels } from '../../types/pages.editor.document.types';

export interface PageEditorToggleLabels {
  readonly open: string;
  readonly title: string;
}

export interface PageEditorSubpageLabels {
  readonly subpage: string;
  readonly untitled: string;
}

export interface PageEditorMentionTrashedLabels {
  readonly label: string;
  readonly tooltip: (name: string) => string;
}

/** `locale` is the language `Intl.DateTimeFormat` uses to draw the day. */
export interface PageEditorDateLabels {
  readonly field: string;
  readonly label: string;
  readonly locale: string;
}

export interface PageEditorFormulaLabels {
  readonly done: string;
  readonly empty: string;
  readonly field: string;
  readonly help: string;
  readonly inline: string;
  readonly unreadable: string;
}

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
