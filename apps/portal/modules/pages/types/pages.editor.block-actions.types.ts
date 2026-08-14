import type { Command } from 'prosemirror-state';
import type { PageEditorBlockRequestKind } from './pages.editor.block-request.types';
import type { PageDestination } from './pages.editor.destination.types';

/** What the block menu can set in motion on the page it belongs to. */
export interface PageEditorBlockActions {
  readonly ask: (kind: PageEditorBlockRequestKind) => void;
  readonly close: (kind: PageEditorBlockRequestKind) => void;
  readonly copyLink: () => void;
  readonly handOver: (destination: PageDestination) => void;
  readonly runCommand: (command: Command) => void;
  readonly syncInto: (destination: PageDestination) => void;
}
