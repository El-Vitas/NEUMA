import type { PageLifecycle } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { PageIcon } from '../../../appearance/types/pages.icon.types';
import type { PagePersonOption } from '../../../collections/types/pages.schema.types';
import type { PageEditorEmbedLabels } from '../../media/types/pages.editor.embed.types';
import type { PageEditorImageLabels } from '../../media/types/pages.editor.image.types';
import type { PageEditorMediaLabels } from '../../media/types/pages.editor.media.types';
import type {
  PageButtonTemplatesReader,
  PageEditorButtonLabels,
} from '../../structure/types/pages.editor.button.types';
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

/** What the node views read from the page around them; each one that is missing reads as nothing. */
export interface PageEditorNodeViewReaders {
  readonly readBorrowed?: (pageId: string, blockId: string) => EditorNode | null;
  readonly readButtonTemplates?: PageButtonTemplatesReader;
  readonly readPageIcon?: (pageId: string) => PageIcon | null;
  readonly readPageLifecycle?: (pageId: string) => PageLifecycle | null;
  readonly readPageTitle?: (pageId: string) => string | null;
  readonly readPersonForHover?: (userId: string) => PagePersonOption | undefined;
  readonly pressTheButton?: (at: number) => void;
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
