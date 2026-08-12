import type { Command } from 'prosemirror-state';
import type { PageDestination } from './pages.editor.destination.types';

/** What the block menu can set in motion on the page it belongs to. */
export interface PageEditorBlockActions {
  readonly close: () => void;
  readonly copyLink: () => void;
  readonly handOver: (destination: PageDestination) => void;
  readonly runCommand: (command: Command) => void;
}
