import type { Command } from 'prosemirror-state';
import type { PageDestination } from '../../menus/types/pages.editor.destination.types';
import type { PageEditorBlockRequestKind } from './pages.editor.block-request.types';

export interface PageEditorBlockActions {
  readonly ask: (kind: PageEditorBlockRequestKind) => void;
  readonly close: (kind: PageEditorBlockRequestKind) => void;
  readonly copyLink: () => Promise<void>;
  readonly handOver: (destination: PageDestination) => void;
  readonly runCommand: (command: Command) => boolean;
  readonly syncInto: (destination: PageDestination) => void;
}
